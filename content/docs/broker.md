---
title: "Broker Module"
description: "The C++ event broker module for Naemon and Nagios Core: building it with Meson, loading it into the core, and configuring its queues."
date: 2026-08-24
weight: 10
---

The Statusengine Broker Module is a small C++ library that gets loaded into your
Naemon or Nagios Core. It grabs status information as it happens, encodes it as
JSON, and publishes it to a Gearman job server or to RabbitMQ.

Because a queue sits in between, the monitoring core never waits on a database or
on disk I/O. Publishing is a local hand-off; everything after that is somebody
else's problem — the [worker's](../worker/), specifically.

{{< callout type="info" >}}
Run the Gearman job server on the same node as the monitoring core. Publishing
then never leaves the loopback interface, which is the whole point of the
exercise.
{{< /callout >}}

## How it hooks into the core

The module is a NEB (Nagios Event Broker) module. The core loads it, calls
`nebmodule_init()`, and from then on invokes `nebmodule_callback()` for every
event the module registered an interest in:

```cpp
extern "C" { NEB_API_VERSION(CURRENT_NEB_API_VERSION) }

extern "C" int nebmodule_init(int, char *args, nebmodule *handle) {
    return statusengine::Nebmodule::Instance().Init(handle, std::string(args));
}
extern "C" int nebmodule_deinit(int, int reason) {
    return statusengine::Nebmodule::Instance().Deinit(reason);
}
int nebmodule_callback(int event_type, void *data) {
    return statusengine::Nebmodule::Instance().Callback(event_type, data);
}
```

The `args` string the core passes to `nebmodule_init()` **is the path to the
configuration file**. That is the whole interface: one shared object, one TOML
file.

A callback is only registered when at least one queue is configured for it. An
event type you have not named in the configuration costs nothing at runtime,
because the module never asks the core for it.

## Supported monitoring cores

| Core | Build | Notes |
|---|---|---|
| Naemon | default | Needs `naemon` in `PKG_CONFIG_PATH`. Only the include directory is used — the module does not link against `libnaemon`. |
| Nagios Core | `-Dnagios=true` | Needs `-Dnagios_include_dir=` pointing at the Nagios headers. |

Either way you need the **headers** of a compiled core, so build and install
Naemon or Nagios before building the broker.

## Building from source

### Dependencies

{{< tabs items="Ubuntu / Debian,CentOS / RHEL" >}}
  {{< tab >}}
```bash
apt install git python3-pip gcc g++ cmake build-essential libglib2.0-dev \
    libgearman-dev uuid-dev libuchardet-dev libjson-c-dev pkg-config \
    libssl-dev librabbitmq-dev
pip3 install meson ninja
```
  {{< /tab >}}
  {{< tab >}}
```bash
yum install git python-pip gcc gcc-c++ cmake3 pkgconfig librabbitmq-devel \
    libgearman-devel libuchardet-devel json-c-devel openssl-devel glib2-devel
pip install meson ninja
```
  {{< /tab >}}
{{< /tabs >}}

### Get the sources

```bash
cd /tmp
git clone https://github.com/statusengine/broker
cd broker
```

### Configure and build

{{< tabs items="Naemon,Nagios Core" >}}
  {{< tab >}}
```bash
export PKG_CONFIG_PATH=/opt/naemon/lib/pkgconfig/
meson setup --buildtype=release build
ninja -C build
```
  {{< /tab >}}
  {{< tab >}}
```bash
meson setup -Dnagios=true -Dnagios_include_dir=/opt/nagios/include \
    --buildtype=release build
ninja -C build
```
  {{< /tab >}}
{{< /tabs >}}

### Install

```bash
ninja -C build install
```

The default prefix is `/usr/local`, so the library lands at
`/usr/local/lib/libstatusengine.so`. Pass `--prefix=/opt/naemon` to `meson setup`
to install it next to your core instead.

### Build options

| Option | Default | Effect |
|---|---|---|
| `-Dgearman=false` | `true` | Build without Gearman support |
| `-Drabbitmq=false` | `true` | Build without RabbitMQ support |
| `-Dnagios=true` | `false` | Build against Nagios Core instead of Naemon |
| `-Dnagios_include_dir=` | *(empty)* | Path to the Nagios headers, required with `-Dnagios=true` |

Disabling a transport you do not use drops its client library from the
dependency list, which is worth doing if you are packaging the module.

## Loading the module

Add one line to `naemon.cfg` or `nagios.cfg` — or, on Naemon, drop a file into
`module-conf.d/`:

```ini
broker_module=/opt/naemon/lib/libstatusengine.so /path/to/statusengine.toml
```

Then restart the core. On success the module logs its startup with the prefix
`Statusengine: `; if it cannot reach the configured queue, `nebmodule_init()`
returns non-zero and the core refuses to start.

{{< callout type="warning" >}}
Everything is disabled by default. A freshly installed module with an empty
configuration file loads successfully and does nothing at all — you have to name
each queue you want before any event is published.
{{< /callout >}}

### A configuration matched to the Go worker

The `statusengine.toml` shipped with the broker predates the Go worker and does
not line up with it: it enables `FlappingData`, which the worker has no consumer
for, and leaves `LogData` and `NotificationData` commented out, which the worker
does consume. This is the minimal Gearman configuration that publishes exactly
the twelve queues the [worker](../worker/) reads and nothing else:

```toml
[[Gearman]]
URL = "127.0.0.1:4730"

HostStatus                    = "statusngin_hoststatus"
ServiceStatus                 = "statusngin_servicestatus"
HostCheck                     = "statusngin_hostchecks"
ServiceCheck                  = "statusngin_servicechecks"
ServicePerfData               = "statusngin_service_perfdata"
StateChange                   = "statusngin_statechanges"
LogData                       = "statusngin_logentries"
NotificationData              = "statusngin_notifications"
ContactNotificationMethodData = "statusngin_contactnotificationmethod"
AcknowledgementData           = "statusngin_acknowledgements"
DowntimeData                  = "statusngin_downtimes"
RestartData                   = "statusngin_core_restart"

# Inbound: external commands the worker publishes are handed to the core here.
WorkerCommand = "statusngin_cmd"

[Bulk]
Queues = ["HostStatus", "HostCheck", "ServiceStatus", "ServiceCheck",
          "ServicePerfData", "StateChange", "LogData"]

[Log]
Level = "Warning"
```

Publishing a queue the worker does not consume is not an error — the messages
simply accumulate on the queue server until something drains them, which on a
busy installation is a slow way to run out of memory.

## Configuration

{{< callout type="warning" >}}
**Section not written yet.** It will document `[[Gearman]]`, `[[Rabbitmq]]`,
`[Bulk]`, `[Scheduler]`, `[Log]` and `[Worker]`, each with a complete parameter
table taken from `src/Configuration.h`.
{{< /callout >}}

## Queue identifier reference

{{< callout type="warning" >}}
**Section not written yet.** It will list all 23 outbound queue identifiers with
the NEB callback behind each, plus the three inbound worker queues
(`WorkerCommand`, `WorkerOCHP`, `WorkerOCSP`).
{{< /callout >}}

## JSON message format

{{< callout type="warning" >}}
**Section not written yet.** It will document the common event envelope, the
per-event nested objects, and the bulk format
`{"messages": [...], "format": "none"}`.
{{< /callout >}}

## Submitting data to the core

{{< callout type="warning" >}}
**Section not written yet.** It will document the `WorkerCommand` queue and its
four commands: `check_result`, `schedule_check`, `delete_downtime` and `raw`.
{{< /callout >}}

## Debugging

{{< callout type="warning" >}}
**Section not written yet.** It will cover raising `[Log] Level` to `Info`,
reading the `Statusengine: ` lines in the core's log, and inspecting queue depth
with `gearadmin --status` or the RabbitMQ management UI.
{{< /callout >}}
