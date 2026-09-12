---
title: "Worker"
description: "The Go worker: consuming Gearman or RabbitMQ, bulk-inserting into MySQL, routing performance data to Graphite, and running under systemd."
date: 2026-08-24
weight: 20
# Old Spress site served the 3.x worker here. Point it at the current docs;
# the 3.x page is reachable from the callout below and from /v3/.
aliases:
  - /worker/
---

<div class="se-intro">
  <p>
    The Statusengine Worker is the other half of the pipeline: it drains the
    queue that the <a href="../broker/">broker module</a> fills. It is written
    in Go and is the successor to the original PHP worker.
  </p>

  <figure class="se-mascot">
    <img src="/images/gopher-worker.svg" width="240" height="290"
         alt="A Go gopher wearing a red warning beacon on its head." />
    <figcaption>
      Based on the Go gopher by Renée French,
      <a href="https://creativecommons.org/licenses/by/4.0/" target="_blank" rel="noreferrer">CC BY 4.0<span class="se-external" aria-hidden="true">&nbsp;↗</span></a>.
    </figcaption>
  </figure>
</div>

{{< callout type="warning" >}}
This is **not** the PHP worker. Configuration, database backends and command-line
tools are all different. If you are coming from Statusengine 3.x, treat this as a
new component rather than an upgrade — the old `config.yml` will not carry over.
The 3.x worker is documented at [Statusengine 3 › Worker (PHP)](../../v3/worker/).
{{< /callout >}}

## What it does

{{< cards >}}
  {{< card title="Consumes the queue" subtitle="Gearman or RabbitMQ, chosen with a single configuration key. Payloads are decoded and routed by event type." >}}
  {{< card title="Writes MySQL in bulk" subtitle="Events are buffered per table and flushed either when the batch fills up or every 250 ms, whichever comes first." >}}
  {{< card title="Routes performance data" subtitle="Metrics go to MySQL, to Graphite, or to both — one setting decides." >}}
  {{< card title="Broadcasts live events" subtitle="A WebSocket hub serves every event the worker sees, with topic-based subscriptions and mandatory API-key auth." >}}
  {{< card title="Exposes Prometheus metrics" subtitle="Queue throughput, flush behaviour, retries and backend availability, on a separate port." >}}
  {{< card title="Accepts external commands" subtitle="An HTTP endpoint publishes commands onto the command queue, which the broker hands back to the monitoring core." >}}
{{< /cards >}}

## Requirements

| Component        | Requirement                                                        |
|------------------|--------------------------------------------------------------------|
| Go               | 1.26.5 (only to build; the result is a static binary)              |
| Database         | MySQL 8.0+ or MariaDB 10.5+                                        |
| Queue            | Gearman **or** RabbitMQ, matching whatever the broker publishes to |
| Performance data | Graphite (Carbon plaintext), optional                              |

There is no PostgreSQL, CrateDB or Elasticsearch backend, and no Redis
dependency. If a guide tells you otherwise, it is describing the old [PHP worker](../../v3/worker/).

## Build and install

```bash
git clone https://github.com/statusengine/statusengine-worker
cd statusengine-worker

make build
```

`make build` produces every binary in `bin/`, stamped with version information
through `-ldflags`. A plain `go build` skips that stamping, so the resulting
binary reports its version as `dev`:

```console
$ ./bin/worker -version
statusengine-worker 1.4.0 (commit 8706d2f41f28, built 2026-08-19T17:33:16Z, go1.26.5)
```

Useful targets:

| Target | Effect |
|---|---|
| `make build` | Build all binaries into `bin/` |
| `make test` | `go test ./... -race`; unreachable services are skipped |
| `make test-all` | The same, but a missing MySQL, gearmand or RabbitMQ fails the run |
| `make install` | Install `worker` and `db_cleanup` into `/usr/local/bin` under their service names |
| `make install-systemd` | Install the unit files, without enabling anything |
| `make help` | List the targets |

### A full install

```bash
sudo useradd --system --no-create-home --shell /usr/sbin/nologin statusengine
sudo mkdir -p /etc/statusengine
sudo cp config.example.yaml /etc/statusengine/config.yml

sudo make install            # binaries into /usr/local/bin under their service names
sudo make install-systemd    # unit files, without enabling anything

sudo systemctl enable --now statusengine-worker
sudo systemctl enable --now statusengine-db-cleanup.timer
```

{{< callout type="warning" >}}
Put API keys in `/etc/statusengine/worker.env`, never in `ExecStart`. Anything on
a command line is readable by every user on the box through `/proc`.

```bash
STATUSENGINE_API_KEYS=key-one,key-two
```
{{< /callout >}}

## Configuration

Every setting can be given four ways, and they resolve in this order:

```text
explicit CLI flag  >  environment variable  >  config file  >  built-in default
```

Every key is optional — omit anything you do not want to override. A minimal
file that switches the queue backend and points at a real database looks like
this:

```yaml
consumer: gearman
gearman_addr: 127.0.0.1:4730
mysql_dsn: "statusengine:secret@tcp(127.0.0.1:3306)/statusengine?parseTime=true"
perfdata_route: mysql
```

{{< callout type="warning" >}}
**Full reference not written yet.** It will document every key from
`config.example.yaml` with its default, flag and environment variable, grouped
into queue, MySQL, Graphite and perfdata, WebSocket and API keys, command API,
and logging.
{{< /callout >}}

## Database

{{< callout type="warning" >}}
**Section not written yet.** It will cover the 22 tables of the schema, the
`utf8mb4` requirement, and the fact that partitioning on the history tables is
maintained outside the worker.
{{< /callout >}}

## Performance data

{{< callout type="warning" >}}
**Section not written yet.** It will document `perfdata_route`
(`mysql` / `graphite` / `both`) and the Graphite metric path
`<graphite_prefix>.<hostname>.<service_description>.<metric_label>`.
{{< /callout >}}

## Running as a systemd service

{{< callout type="warning" >}}
**Section not written yet.** It will cover the three shipped units and why
`TimeoutStopSec=90s` must not be shortened: on `SIGTERM` the worker stops
consuming, drains in-flight jobs and flushes its buffers, and the worst case is
the sum of three bounded waits.
{{< /callout >}}

## Data retention

Nothing in the worker deletes anything. A monitoring core producing a few
thousand checks a minute fills `statusengine_hostchecks` and
`statusengine_servicechecks` faster than anything else in the schema, and
trimming them is the job of a second binary, `statusengine-db-cleanup`.

It reads the **same configuration file** as the worker — each binary ignores the
other's keys — so retention is configured next to everything else:

```bash
statusengine-db-cleanup -config /etc/statusengine/config.yml
```

`make install-systemd` ships a timer for it:

```bash
systemctl enable --now statusengine-db-cleanup.timer
```

Daily, with `Persistent=true` so a missed run is caught up rather than skipped —
retention that quietly stops running is noticed when the disk fills — and
`RandomizedDelaySec=1h` to keep it off the top of the hour.

{{< callout type="warning" >}}
**In a cluster, run it on exactly one node.** The randomised delay spreads the
load within a host, not across them. Several nodes deleting from the same tables
at the same time is the realistic source of the lock contention that
[`statusengine_db_batch_retries_total`](#monitoring-the-worker) counts. If you
must run it on more than one, give each a clearly different `OnCalendar`.
{{< /callout >}}

### How long to keep what

Every value is a number of **days**, and every key is optional — omit one and
its default below applies. The key names are the ones the PHP worker used, so an
existing `config.yml` can be carried over value for value, including its
convention:

**`0` disables cleanup of that table entirely.** Only an explicit `0` switches a
table off; a missing key falls back to the default.

| Key | Default | Cleans |
|---|---|---|
| `age_hostchecks`<br>`age_servicechecks` | 5 | `statusengine_hostchecks`, `statusengine_servicechecks`. By far the largest tables — these two are why the cleanup exists. |
| `age_host_statehistory`<br>`age_service_statehistory` | 365 | The state history. Kept far longer than checks because availability reports are computed from it. |
| `age_host_acknowledgements`<br>`age_service_acknowledgements` | 60 | The acknowledgement tables. |
| `age_host_notifications`<br>`age_service_notifications` | 60 | One row per notified contact. |
| `age_host_notifications_log`<br>`age_service_notifications_log` | 60 | One row per notification event. |
| `age_host_downtimes`<br>`age_service_downtimes` | 60 | The `*_downtimehistory` tables — **not** currently scheduled downtimes, which are never touched, despite what the legacy key name suggests. |
| `age_logentries` | 5 | `statusengine_logentries`. |
| `age_perfdata` | 90 | `statusengine_perfdata`. Only relevant while `perfdata_route` writes to MySQL; with Graphite, Graphite's own retention applies instead. |

```yaml
age_hostchecks: 5
age_servicechecks: 5
age_host_statehistory: 365
age_service_statehistory: 365
age_perfdata: 0          # perfdata_route: graphite — let Graphite handle it
```

### Deleting without hurting

Rows go in batches, each its own transaction, and two settings shape that.

**`cleanup_batch_size`** is the number of rows per `DELETE`, `5000` by default.
Smaller batches hold locks for shorter, keep the undo log small and produce
binlog events a replica can digest — at the cost of more round-trips.

**`cleanup_batch_pause`** is a duration between two batches of the same table,
`0s` by default. No pause deletes as fast as the database allows, which is the
right setting for a nightly run on an idle system; set `50ms` or so if the
cleanup has to share the database with live check results.

The tool stops cleanly between batches on `SIGTERM`, so it never has to be
killed mid-statement. The unit allows it 300 seconds to do that, which matters
for the first run against a database that has never been cleaned — that one can
take a while, and it is the run most likely to be interrupted.

## Monitoring the worker

The worker exports 30 Prometheus series on its own port, `metrics_listen_addr`,
`:9105` by default. That server has **no authentication of its own** — it is
meant to be reached by a trusted scraper, which means keeping the port off any
public network rather than putting a key on it.

Every series exists from the first scrape, before anything has happened, so an
alerting rule never has to cope with a metric that is missing until the first
event arrives. The one deliberate exception is `statusengine_queue_connected`,
which appears once a consumer has actually connected: a pre-created `0` would
claim an outage for every queue during startup.

The [Worker API reference](../api/) documents all 30 with the reasoning behind
each. These are the ones worth an alert:

**`statusengine_db_available` is `0`.** Bulk inserts are not reaching MySQL.
Nothing is lost while this is zero — the batch is held and the backlog waits at
the broker — but nothing is draining either, so the catch-up afterwards takes as
long as the outage did.

**`statusengine_queue_connected` is `0`** for a `queue_name`. That consumer has
lost its connection. This is the only series that separates *stopped* from
*idle*: both leave `messages_received_total` flat and `jobs_in_flight` at zero.
On RabbitMQ one connection carries every queue, so all of them move together; on
Gearman each queue has its own and they move independently.

**`statusengine_graphite_metrics_dropped_total` is rising.** Every increment is a
metric that now exists nowhere. Graphite fails differently from MySQL on
purpose: an unreachable Carbon is dropped rather than retried, because retrying
would stall the database path or grow the buffer without bound.

**`statusengine_queue_downtime_updates_unmatched_total` is rising.** A downtime's
START or STOP found no row to update, so the ADD that should have created it
never arrived and the event is lost — silently, because MySQL reports the UPDATE
as successful. Expect a few right after a fresh installation and none afterwards.

**`statusengine_db_batch_retries_total` is climbing steadily.** Bulk inserts
re-run after a deadlock or a lock wait timeout. The occasional one is harmless;
a steady climb means another writer is contending for the same rows, in practice
[`db_cleanup`](#data-retention) running against a busy table.

`statusengine_websocket_messages_dropped_total` looks alarming and usually is
not: it counts events a client was too slow to accept. That is a problem with
that client, not with the worker, and the pipeline is deliberately unaffected —
see [When a client cannot keep up](#when-a-client-cannot-keep-up).

### Is it keeping up?

Three series answer that together, and none of them is an alert on its own.

`statusengine_queue_jobs_in_flight` sitting at the consumer's concurrency cap
for a queue — 8 per queue on Gearman, 100 on RabbitMQ, both configurable — means
the broker is feeding that queue faster than the pipeline drains it. That is
working as designed: the surplus waits at the broker instead of accumulating in
this process. Read it per queue. One queue at its cap while the others idle is
normal during a backlog and does not mean the others are blocked.

`statusengine_queue_handler_duration_seconds` shows where that time goes. A
handler blocks in the bulk-insert buffer once it is full, so this is where MySQL
backpressure becomes visible from the ingestion side.

`statusengine_db_batch_size_at_flush` pinned at the configured batch size means
flushes are triggered by the batch filling up rather than by the 250 ms ticker —
the same saturation, seen from the database side.

## WebSocket event stream

Everything the worker writes to MySQL it also broadcasts live on `/ws`. Nothing
is stored for a client that is not connected — this is a stream, not a backlog —
which makes it the right tool for a dashboard, a chat notifier or anything that
wants to react to a state change now, and the wrong one for anything that must
not miss an event.

The server listens on `listen_addr`, `127.0.0.1:8080` by default. The full
protocol, with a captured example for every event topic, is in the
[Worker API reference](../api/); what follows is what you
need to run it.

### Authentication is always on

There is no setting that turns it off. Leave `api_keys` empty and the worker
generates a 256-bit key for that run and logs it:

```console
WARN websocket: no API key configured, generated a random one for this run
     api_key=8f3c…  hint="set -api-keys/STATUSENGINE_API_KEYS (or api_keys in the config file) for a stable key"
```

That is a safety net, not a setup: the key changes on every restart, so any
client that reconnects on its own needs a configured one.

```yaml
api_keys:
  - "a-long-random-string"
```

A client presents it as `Authorization: Bearer <key>` or `X-Api-Key: <key>`.
There is a third way, `?api_key=<key>` in the URL, and it exists only because a
browser's `WebSocket` constructor cannot set headers — a key in a URL ends up in
proxy logs and browser history, so use a header everywhere else.

{{< callout type="warning" >}}
The key matters even on loopback. A WebSocket handshake is not subject to the
same-origin policy and triggers no CORS preflight, so an unauthenticated `/ws`
on **any** address a browser can reach — `127.0.0.1` included — can be opened by
any web page the operator happens to visit, which then receives the entire event
stream. Binding to loopback narrows who can reach the port; the key is what
makes reaching it useless.

The handshake's `Origin` header is deliberately not checked: that would defend
an endpoint whose security depends on the browser, and this one does not.
{{< /callout >}}

### Topics

A topic is a queue name. Subscribe at connect time:

```text
ws://host/ws?topics=statusngin_hoststatus,statusngin_servicestatus
```

or change it later by sending a control frame at any time:

```json
{"subscribe": ["statusngin_logentries"]}
{"unsubscribe": ["statusngin_hoststatus"]}
```

**Subscribing to nothing means subscribing to everything.** A client that
connects without `?topics=` receives every topic the worker consumes, which on a
large installation is a great deal of traffic — name what you want.

### Frame format

One frame per **job**, not per event:

```json
{"topic": "statusngin_hoststatus", "payload": [ … ]}
```

`payload` is always an array, even for the four queues the broker never bulks —
those send an array of one — so a client never has to branch on the shape. The
array is one bulk message as the broker sent it, so a frame typically carries a
hundred events rather than one.

### When a client cannot keep up

The hub never blocks the pipeline to wait for a slow reader. It buffers 1024
frames inbound and 256 frames per client, and when a buffer is full the frame is
**dropped for that client** — the database write and every other client are
unaffected. Drops are counted per client, reported when it disconnects, and
exported as Prometheus counters.

A client that drops is a client that is too slow, or a link that is too thin.
Subscribing to fewer topics is usually the fix; reading the socket in a loop that
does no work of its own is the other.

## The /commands API

The queue runs both ways. `/commands` takes Naemon external commands over HTTP,
publishes them to the `statusngin_cmd` queue, and the
[broker module applies them to the running core](../broker/#submitting-data-to-the-core) —
which is how a dashboard acknowledges a problem or forces a check without a
shell on the monitoring host.

### It is off unless you switch it on

Unlike `/ws`, an unconfigured key here means the endpoint is **not served at
all**:

```console
INFO command: endpoint disabled, no API key configured
     hint="set -command-api-keys/STATUSENGINE_API_COMMAND_KEYS to enable /commands"
```

Enabling it takes one key, and it is deliberately a different list from
`api_keys`:

```yaml
command_api_keys:
  - "another-long-random-string"
command_listen_addr: 127.0.0.1:8081
```

An `api_keys` entry grants *reading* the event stream. A `command_api_keys`
entry grants *controlling the monitoring core*. Those are not the same
privilege, so they are not the same key — and the endpoint gets its own port, so
exposing the stream on the network does not also expose the write endpoint.

### Sending commands

The body is the broker's own envelope, unchanged — the same JSON a client would
publish to Gearman or RabbitMQ directly, so the four commands and their fields
are the ones documented under
[Submitting data to the core](../broker/#submitting-data-to-the-core):
`check_result`, `schedule_check`, `delete_downtime` and `raw`.

```bash
curl -X POST http://127.0.0.1:8081/commands \
  -H "Authorization: Bearer another-long-random-string" \
  -H "Content-Type: application/json" \
  -d '{"Command": "raw", "Data": "SCHEDULE_FORCED_SVC_CHECK;localhost;PING;1700000000"}'
```

A bulk sends many at once and may mix types freely:

```json
{"messages": [
  {"Command": "check_result", "Data": {"host_name": "localhost", "output": "OK"}},
  {"Command": "raw", "Data": "ENABLE_HOST_FLAP_DETECTION;localhost"}
]}
```

One request carries at most 1000 commands and 8 MiB of body. Both limits exist
so a rejection names the actual problem rather than surfacing as a truncated
read — but the number that matters in practice is much smaller: the broker
applies a bulk inside the monitoring core's event loop and cannot be interrupted
part-way through one, so
**[keep a bulk to about 50](../broker/#bulk-messages-here-too)**.

{{< callout type="info" >}}
A `raw` string needs no `[timestamp]` prefix here. The worker prepends the
current time when the string does not already start with one, and leaves a
timestamp you supplied alone. Publishing to `statusngin_cmd` directly is the
case where you have to write it yourself.
{{< /callout >}}

### What it refuses

Five external commands are rejected even with a valid key:

| Denied | |
|---|---|
| `SHUTDOWN_PROGRAM`, `SHUTDOWN_PROCESS` | Two spellings Naemon registers against the same handler. Denying only the familiar one would be a filter that looks right and stops nothing. |
| `RESTART_PROGRAM`, `RESTART_PROCESS` | The same, for restart. |
| `PROCESS_FILE` | Reads a file and runs every line in it as an external command. Without this entry the rest of the list would be decoration: put `SHUTDOWN_PROGRAM` in a file and have Naemon read it. |

Notably absent are `CHANGE_*_CHECK_COMMAND` and `CHANGE_*_EVENT_HANDLER`, the
obvious route to running arbitrary code. Naemon disables those internally, so
there is nothing left to deny.

{{< callout type="warning" >}}
This is a denylist, so it protects against an accident, not against intent. A
caller holding a valid key can still `DISABLE_NOTIFICATIONS` for every host you
have. The real control is which keys exist and who holds them — treat a
`command_api_keys` entry as root on the monitoring core.
{{< /callout >}}

## Development tooling

{{< callout type="warning" >}}
**Section not written yet.** It will cover `simulator`, `gearman_publisher`,
`rabbitmq_publisher`, `db_verifier` and `losstest`.
{{< /callout >}}
