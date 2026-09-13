---
title: "Broker Module"
description: "The C++ event broker module for Naemon and Nagios Core: building it with Meson, loading it into the core, and configuring its queues."
date: 2026-08-24
weight: 10
aliases:
  - /broker/
---

<div class="se-intro">
  <p>
    The Statusengine Broker Module is a small C++ library that gets loaded into
    your Naemon or Nagios Core. It grabs status information as it happens,
    encodes it as JSON and publishes it to a Gearman job server or to RabbitMQ.
  </p>

  <figure class="se-mascot">
    <img src="/images/cpp-broker.svg" width="240" height="290"
         alt="A blue hexagonal character marked C++, transmitting from a red antenna." />
  </figure>
</div>

Because a queue sits in between, the monitoring core never waits on a database or
on disk I/O. Publishing is a local hand-off; everything after that is _somebody
else's_ problem. The [worker's](../worker/), specifically.

{{< callout type="info" >}}
Run the Gearman job server on the same node as the monitoring core. Publishing
then never leaves the loopback interface, which is much faster than going over the network.
{{< /callout >}}

## How it hooks into the core

The module is a NEB ([Naemon Event Broker](https://www.naemon.io/documentation/developer/neb_broker)) module,
which gets loaded by the monitoring core. As a user, you only need to add the
`broker_module=/path/to/module.so` line into your config.  

{{< details title="Hooking details" closed="true" >}}
This is mainly for developers who want to understand how the module integrates with the core.

The core loads it, calls
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
{{< /details >}}

## Supported monitoring cores

| Core        | Build           | Notes                                                                                                                   |
|-------------|-----------------|-------------------------------------------------------------------------------------------------------------------------|
| Naemon      | default         | Needs `naemon` in `PKG_CONFIG_PATH`. Only the include directory is used. The module does not link against `libnaemon`. |
| Nagios Core | `-Dnagios=true` | Needs `-Dnagios_include_dir=` pointing at the Nagios headers.                                                           |

Either way you need the **headers** of a compiled core, so build and install
[Naemon]({{< relref "/tutorials/install-naemon" >}}) or [Nagios]({{< relref "/tutorials/install-nagios" >}}) before building the broker.

## Building from source

### Dependencies

{{< tabs items="Ubuntu / Debian,AlmaLinux / RHEL" >}}
  {{< tab >}}
```bash
apt install git python3-pip gcc g++ cmake build-essential libglib2.0-dev \
    libgearman-dev uuid-dev libuchardet-dev pkg-config \
    libssl-dev librabbitmq-dev
pip3 install meson ninja
```
  {{< /tab >}}
  {{< tab >}}
```bash
dnf install git python3-pip gcc gcc-c++ cmake3 pkgconfig librabbitmq-devel \
    libgearman-devel libuchardet-devel openssl-devel glib2-devel
pip3 install meson ninja
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

| Option                  | Default   | Effect                                                    |
|-------------------------|-----------|-----------------------------------------------------------|
| `-Dgearman=false`       | `true`    | Build without Gearman support                             |
| `-Drabbitmq=false`      | `true`    | Build without RabbitMQ support                            |
| `-Dnagios=true`         | `false`   | Build against Nagios Core instead of Naemon               |
| `-Dnagios_include_dir=` | *(empty)* | Path to the Nagios headers, required with `-Dnagios=true` |


Disabling a transport you do not use drops its client library from the
dependency list, which is worth doing if you are packaging the module.

## Loading the module

Add one line to `naemon.cfg` or `nagios.cfg`. On Naemon, you can also
drop a file into `module-conf.d/`:

```ini
broker_module=/opt/naemon/lib/libstatusengine.so /path/to/statusengine.toml
```

Then restart the core. On success the module logs its startup with the prefix
`Statusengine:`. If it cannot reach the configured queue, `nebmodule_init()`
returns non-zero and the core refuses to start.

{{< callout type="warning" >}}
Everything is disabled by default. A freshly installed module with an empty
configuration file loads successfully and does nothing at all. You need to name
each queue you want before any event is published.
{{< /callout >}}

### A configuration matched to the Go worker

This is a minimal Gearman configuration that publishes exactly
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
          "ServicePerfData", "StateChange", "LogData", "NotificationData"]

[Log]
Level = "Warning"
```

Publishing a queue the worker does not consume is not an error. The messages
simply accumulate on the queue server until something drains them, which on a
busy installation is a slow way to run out of memory.

A full configuration example for the broker module can be found here: [statusengine.toml](https://github.com/statusengine/broker/blob/master/statusengine.toml)

## Queue identifier reference

An identifier is the left-hand side of a `Identifier = "queue name"` line inside
a `[[Gearman]]` or `[[Rabbitmq]]` section. The name on the right is yours to
choose; the names below are the ones the shipped `statusengine.toml` suggests,
and **the Go worker expects those exact names**. An identifier you do not write down
publishes nothing - see [the callout above](#loading-the-module).

### Outbound: core to queue

23 identifiers, in the order `src/Queue.h` declares them. The
[Go worker](../worker/) has a consumer for 12 of them. The twelve in
[the configuration above](#a-configuration-matched-to-the-go-worker). The other
11 are not consumed by Statusengine itself.

| Identifier<br>suggested queue name | What it carries |
|---|---|
| **`HostStatus`**<br>`statusngin_hoststatus` | The full current status of one host, on every status update the core reports - not only on a state change. |
| **`HostCheck`**<br>`statusngin_hostchecks` | One completed host check with plugin output, perfdata and timings. Published on `NEBTYPE_HOSTCHECK_PROCESSED`, so a check appears once, finished. |
| **`ServiceStatus`**<br>`statusngin_servicestatus` | The same as `HostStatus`, for one service. |
| **`ServiceCheck`**<br>`statusngin_servicechecks` | The same as `HostCheck`, for one service. |
| **`ServicePerfData`**<br>`statusngin_service_perfdata` | A reduced service check: host name, service description, `perf_data` and `start_time`, nothing else. Only for services with `process_performance_data` enabled. |
| **`StateChange`**<br>`statusngin_statechanges` | Host **and** service state changes on one queue; `statechange_type` tells them apart. |
| **`LogData`**<br>`statusngin_logentries` | Raw log lines. The same text the core writes to its own log file. |
| **`AcknowledgementData`**<br>`statusngin_acknowledgements` | One message per acknowledgement set on a host or service. |
| **`FlappingData`**<br>`statusngin_flappings` | Flapping start and stop events. |
| **`DowntimeData`**<br>`statusngin_downtimes` | A downtime's entire lifecycle — add, start, stop, delete — on one queue, distinguished by `type` and `attr`. |
| **`ContactNotificationMethodData`**<br>`statusngin_contactnotificationmethod` | One message per contact actually notified, once that delivery has completed. |
| **`RestartData`**<br>`statusngin_core_restart` | Fires once, on `NEBTYPE_PROCESS_START`, when the core starts or reloads its configuration. |
| **`SystemCommandData`**<br>`statusngin_systemcommands` | Commands the core ran itself, such as event handlers and notification commands, with `return_code`, output and timings. |
| **`CommentData`**<br>`statusngin_comments` | Comments added to or deleted from a host or service. |
| **`ExternalCommandData`**<br>`statusngin_externalcommands` | Every external command the core accepts, including the ones this module submits through `WorkerCommand`, which reach the core the same way. |
| **`NotificationData`**<br>`statusngin_notifications` | The notification as a whole, start and end, with how many contacts it reached. |
| **`ProgramStatusData`**<br>`statusngin_programmstatus` | Core-wide status: whether checks and notifications are enabled, when the command file was last read, and so on. |
| **`ContactStatusData`**<br>`statusngin_contactstatus` | Per-contact status, such as when that contact was last notified. |
| **`ContactNotificationData`**<br>`statusngin_contactnotificationdata` | One notification to one contact, before it is broken down into delivery methods. |
| **`EventHandlerData`**<br>`statusngin_eventhandler` | Event handler executions, global and per object. |
| **`ProcessData`**<br>`statusngin_processdata` | Every core process event — start, event loop start and end, shutdown. `RestartData` is the one useful slice of this. |
| **`OCSP`**<br>`statusngin_ocsp` | The same payload as `ServiceCheck`, for forwarding service check results to another Statusengine node's `WorkerOCSP`. |
| **`OCHP`**<br>`statusngin_ochp` | The same payload as `HostCheck`, for forwarding host check results to another node's `WorkerOCHP`. |

`statusngin_programmstatus` is spelled with two `m` in the shipped
configuration. It is only a suggestion like every other name here, but changing
it means changing it on both sides.

### Inbound: queue to core

Three identifiers work the other way round. The module consumes them inside the
core's event loop and applies what it finds, which is what makes the queue
two-way — and what the `[Worker]` section's time budget exists to bound.

| Identifier | Suggested queue name | What it accepts |
|---|---|---|
| `WorkerCommand` | `statusngin_cmd` | `{"Command": …, "Data": …}` with one of four commands: `check_result` submits a passive result, `schedule_check` reschedules a host or service, `delete_downtime` removes one, and `raw` hands an external command string to the core verbatim. |
| `WorkerOCSP` | `statusngin_ocsp` | `{"servicecheck": …}` - a service check result produced by another node's `OCSP` queue, submitted to this core as a passive result. |
| `WorkerOCHP` | `statusngin_ochp` | `{"hostcheck": …}` - the same for host checks, from another node's `OCHP`. |

### Bulk messages

Any outbound identifier named in `[Bulk] Queues` is batched: instead of one
message per event, the module collects events and publishes
`{"messages": [ … ], "format": "none"}`. The setting is global. It applies to
every `[[Gearman]]` and `[[Rabbitmq]]` connection and a batch is flushed when
it reaches `Maximum` messages (200) or after `FlushInterval` seconds (10),
whichever comes first.

Bulking is what keeps a busy core from producing one queue job per check. It
costs a little latency, bounded by `FlushInterval`, and the shipped default
covers the queues where the volume actually is:

```toml
[Bulk]
Queues = ["HostStatus", "HostCheck", "ServiceStatus", "ServiceCheck",
          "ServicePerfData", "StateChange", "LogData", "NotificationData",
          "OCHP", "OCSP"]
```

{{< callout type="warning" >}}
The module will bulk **any** identifier you put in that list, but the Go worker
only understands a bulk payload on eight of them: written in
[the worker-matched configuration above](#a-configuration-matched-to-the-go-worker).

`AcknowledgementData`, `DowntimeData`, `ContactNotificationMethodData` and
`RestartData` are decoded as single messages. Adding one of those to
`[Bulk] Queues` produces a payload the worker cannot read, and the events are
lost with a decode error rather than a warning about the configuration.

The inbound queues are unaffected: the module's own consumer unwraps a
`messages` array on all three.
{{< /callout >}}

## OCSP and OCHP

Naemon and Nagios can run a command after every check, called `ocsp_command` and
`ochp_command`, the *obsessive compulsive* service and host processors. They
work, and they fork a process for every single check result, which is the one
thing a busy core cannot afford.

The `OCSP` and `OCHP` queues replace that with a copy on a queue. Name them in
any `[[Gearman]]` or `[[Rabbitmq]]` section and every processed check is
published a second time:

```toml
OCSP = "statusngin_ocsp"
OCHP = "statusngin_ochp"
```

Nothing is forked, nothing runs inside the core's event loop, and whatever reads
the queue can be on a different machine. The payload is the same object
`ServiceCheck` and `HostCheck` publish. The separate queue exists so a second
consumer can have its own copy, at its own pace, without competing with the
worker for the check queues.

Two things to point at it:

- **Another Statusengine node.** Its `WorkerOCSP` and `WorkerOCHP` queues take
  exactly this payload and submit it to that core as a passive check result —
  see [Inbound: queue to core](#inbound-queue-to-core). This is how check
  execution is distributed across nodes.
- **Anything you write yourself**, for everything else that wants a copy of
  every check result as it happens.

### Reading the queue

Useful far beyond writing a consumer: this is how you look at what the module is
actually publishing, and how you empty a queue that has run away.

```bash
apt-get install gearman-tools jq
```

One job, pretty-printed, then exit:

```bash
gearman -w -c 1 -f statusngin_ocsp | jq .
```

{{< callout type="warning" >}}
This is a consumer, not a viewer. The job it prints is **taken off the queue**
and is gone. This is fine when you are looking at what the module produces, and the
point when you are clearing a backlog, but do not run it against a queue that
something else is supposed to process.

Drop `-c 1` and it keeps going until you interrupt it, which is the short way to
drain a queue completely:

```bash
gearman -w -f statusngin_ocsp > /dev/null
```
{{< /callout >}}

Add `-h` and `-p` for a job server that is not on `localhost:4730`. If the tool
cannot reach one at all it prints nothing and waits rather than reporting an
error, so silence here means the connection, not an empty queue. `gearadmin
--status` says which.

{{< details title="What one message looks like" closed="true" >}}
`OCSP` and `OCHP` are in the shipped `[Bulk] Queues` list, so what arrives is a
[bulk envelope](#bulk-messages) holding up to `Maximum` check results. Every
field the module sends is shown here; `hostcheck` messages carry the same set
without `service_description`.

```json
{
  "messages": [
    {
      "type": 701,
      "flags": 0,
      "attr": 0,
      "timestamp": 1614507120,
      "timestamp_usec": 41434,
      "servicecheck": {
        "host_name": "linksys-srw224p",
        "service_description": "PING",
        "command_line": "$USER1$/check_ping -H $HOSTADDRESS$ -w $ARG1$ -c $ARG2$ -p 5",
        "command_name": "check_ping!200.0,20%!600.0,60%",
        "output": "PING CRITICAL - Packet loss = 100%",
        "long_output": "",
        "perf_data": "rta=600.000000ms;200.000000;600.000000;0.000000 pl=100%;20;60;0",
        "check_type": 0,
        "current_attempt": 3,
        "max_attempts": 3,
        "state_type": 1,
        "state": 2,
        "timeout": 60,
        "start_time": 1614507110,
        "end_time": 1614507120,
        "early_timeout": 0,
        "execution_time": 10.004374,
        "latency": 0.03640900179743767,
        "return_code": 2
      }
    }
  ],
  "format": "none"
}
```

`type` is the [NEB event type](https://github.com/naemon/naemon-core/blob/6259292ba9b7780cb0cdc4631a56c0d2eb3eb3ad/src/naemon/broker.h#L42-L133): `701`
is `NEBTYPE_SERVICECHECK_PROCESSED`, and a
host check carries `801`, `NEBTYPE_HOSTCHECK_PROCESSED`. Only processed checks
are published, so the initiate events - `700` and `800` - never appear here.
{{< /details >}}

{{< details title="A consumer in PHP" closed="true" >}}
The same queue read with the `gearman` PECL extension, printing each service
check to stdout. Exit with <kbd>Ctrl</kbd>+<kbd>C</kbd>.

```php
<?php

class StatusengineOcspProcessor {
    private \GearmanWorker $GearmanWorker;

    public function __construct() {
        $this->GearmanWorker = new \GearmanWorker();
        $this->GearmanWorker->addServer('127.0.0.1', 4730);

        // Consume statusngin_ocsp and hand each job to handleOcsp() below.
        $this->GearmanWorker->addFunction('statusngin_ocsp', [$this, 'handleOcsp']);
    }

    public function loop(): void {
        while (true) {
            $this->GearmanWorker->work();
        }
    }

    public function handleOcsp(\GearmanJob $job): void {
        print_r(json_decode($job->workload()));
    }
}

(new StatusengineOcspProcessor())->loop();
```

The extension comes from `apt-get install php-gearman`. Bindings for other
languages are listed in the
[Gearman documentation](http://gearman.org/download/#official-client-libraries).
{{< /details >}}

## Submitting data to the core

Everything so far has been one way. `WorkerCommand` is the way back: the module
consumes it and applies what it finds to the running core, which is what lets
the [worker's `/commands` endpoint](../api/) reach Naemon at all.
`WorkerOCSP` and `WorkerOCHP` — [described above](#inbound-queue-to-core) — take
one fixed payload each; this queue takes four different commands.

Every message is an object with a `Command` and a `Data`:

```json
{"Command": "check_result", "Data": { … }}
```

An unknown `Command`, or a message missing either key, is logged and dropped.

### check_result

Submits a passive check result. `Data` is a check result object; a
`service_description` is what makes it a service check rather than a host check.

```json
{
  "Command": "check_result",
  "Data": {
    "host_name": "localhost",
    "service_description": "PING",
    "output": "PING OK - Packet loss = 0%, RTA = 0.05 ms",
    "long_output": "",
    "perf_data": "rta=0.055000ms;100.000000;500.000000;0.000000 pl=0%;20;60;0",
    "return_code": 0,
    "check_type": 1,
    "start_time": 1614507125,
    "end_time": 1614507129,
    "early_timeout": 0,
    "latency": 0.037,
    "exited_ok": 1
  }
}
```

| Field                                   |                                                                                        |
|-----------------------------------------|----------------------------------------------------------------------------------------|
| `host_name`                             | **Required.** Without it the message is dropped with a warning.                        |
| `service_description`                   | Present makes it a service check, absent a host check.                                 |
| `output`                                | **Required** in practice: a result with neither `output` nor `long_output` is dropped. |
| `long_output`, `perf_data`              | Optional.                                                                              |
| `return_code`                           | The plugin exit code (`0`, `1`, `2`, `3`).                                             |
| `check_type`                            | `0` active, `1` passive.                                                               |
| `start_time`, `end_time`                | Unix timestamps, seconds.                                                              |
| `early_timeout`, `latency`, `exited_ok` | Optional, and what you would expect a check runner to report.                          |


The three output fields are joined back into the single string the core wants
before the result is submitted: `output|perf_data` on the first line, then
`long_output` on the next. **You do not build that string yourself**.
Use the individual fields instead.

### schedule_check

Moves the next check of a host or service to a given time. `schedule_time` is a
Unix timestamp and the check is scheduled **at** it, not merely no later than it.

```json
{
  "Command": "schedule_check",
  "Data": {
    "host_name": "localhost",
    "service_description": "PING",
    "schedule_time": 1614507200
  }
}
```

`host_name` and a non-zero `schedule_time` are both required. Leaving
`service_description` out schedules the host check instead. An object the core
does not know is logged by name and ignored, so a typo in a host name fails
quietly rather than loudly. Look for `Received schedule_check command for
unknown host` in the core's log.

### delete_downtime

Deletes downtimes matching what you give it. Only `host_name` is required;
`service_description`, `start_time`, `end_time` and `comment` narrow it further,
and leaving them all out deletes every downtime on that host.

```json
{
  "Command": "delete_downtime",
  "Data": {
    "host_name": "localhost",
    "service_description": "PING",
    "start_time": 1614507000,
    "end_time": 1614510600,
    "comment": "Ansible run"
  }
}
```

### raw

`Data` is not an object here but a **string**, handed to the core's external
command processor unchanged — the same line you would otherwise echo into
`naemon.cmd`. That makes every
[external command](https://www.naemon.io/documentation/developer/externalcommands/schedule_forced_host_check)
available without the module needing to know about it.

```json
{"Command": "raw", "Data": "[1614507120] SCHEDULE_FORCED_HOST_CHECK;localhost;1614507120"}
```

{{< callout type="warning" >}}
**Publishing to the queue yourself? The leading `[unixtimestamp]` is not
optional.** The core parses these lines exactly as it parses its command file,
and that format starts with the time the command was issued, in square brackets,
followed by a space. Nothing on this side adds it for you — the module hands the
string over unchanged — so a command without it is not executed.

Going through the [worker's `/commands` endpoint](../api/) instead? Then it is
optional: the worker prepends the current time when the string does not already
begin with one, and leaves a timestamp you did supply alone. That is why the
examples over there have no brackets and the ones here do.
{{< /callout >}}

### Bulk messages here too

The inbound side accepts the same `messages` envelope as the outbound queues, so
a client can submit many commands in one job:

```json
{"messages": [
  {"Command": "raw", "Data": "[1614507120] SCHEDULE_FORCED_HOST_CHECK;localhost;1614507120"},
  {"Command": "raw", "Data": "[1614507120] SCHEDULE_FORCED_HOST_CHECK;router;1614507120"}
]}
```

{{< callout type="warning" >}}
**Keep a bulk to about 50 messages.** This module runs inside the monitoring
core's event loop: while it applies your commands, the core schedules no checks,
reaps no results and reads no external commands.

`[Worker] MaxRuntimeMilliseconds` (100 by default) bounds how long one run may
take — but it can only stop *between* messages. A bulk is a single job that has
already been acknowledged and cannot be abandoned half way, so the real
guarantee is "the budget, plus one whole message". A bulk of 50 costs the core a
blip; a bulk of 5000 stalls it for as long as 5000 commands take, whatever the
budget says.

`MaxWorkerMessagesPerInterval` counts jobs, not the commands inside them, so it
is no help here either: a 5000-command bulk counts as one.
{{< /callout >}}

