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
new component rather than an upgrade. The old `config.yml` will not carry over.
The 3.x worker is documented at [Statusengine 3 › Worker (PHP)](../../v3/worker/).
{{< /callout >}}

## What it does

{{< cards >}}
  {{< card title="Consumes the queue" subtitle="Gearman or RabbitMQ, chosen with a single configuration key. Payloads are decoded and routed by event type." >}}
  {{< card title="Writes MySQL in bulk" subtitle="Events are buffered per table and flushed either when the batch fills up or every 250 ms, whichever comes first." >}}
  {{< card title="Routes performance data" subtitle="Metrics go to MySQL, to Graphite, or to both." >}}
  {{< card title="Broadcasts live events" subtitle="A WebSocket hub serves every event the worker sees, with topic-based subscriptions and mandatory API-key auth." >}}
  {{< card title="Exposes Prometheus metrics" subtitle="Queue throughput, flush behavior, retries and backend availability, on a separate port." >}}
  {{< card title="Accepts external commands" subtitle="An HTTP endpoint publishes commands onto the command queue, which the broker hands back to the monitoring core." >}}
{{< /cards >}}

## Requirements

| Component        | Requirement                                                        |
|------------------|--------------------------------------------------------------------|
| Go               | 1.26.5 (only to build; the result is a static binary)              |
| Database         | MySQL 8.0+ or MariaDB 10.5+                                        |
| Queue            | Gearman **or** RabbitMQ, matching whatever the broker publishes to |
| Performance data | Graphite (Carbon plaintext), optional                              |

There is no CrateDB, Elasticsearch, or Redis backend.
If a guide tells you otherwise, it is describing the old [PHP worker](../../v3/worker/).

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

{{< callout type="error" >}}
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

Every key is optional, omit anything you do not want to override. A minimal
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

The worker never creates a table and never migrates one. Statusengine 3.7 and
later managed the schema for you; this one does not, so the 22 tables have to
exist before it starts. They are shipped as a plain SQL file,
`packaging/mysql_schema.sql` in the worker repository.

### Create the database and the user

```sql
CREATE DATABASE IF NOT EXISTS `statusengine` DEFAULT CHARACTER SET utf8mb4;
CREATE USER 'statusengine'@'localhost' IDENTIFIED BY 'a-password-of-your-own';
GRANT ALL PRIVILEGES ON `statusengine`.* TO 'statusengine'@'localhost';
FLUSH PRIVILEGES;
```

No `COLLATE` on purpose. MySQL and MariaDB do not agree on which modern
`utf8mb4` collation exists and the answer changes by version, so naming one here
is how you end up with a database that refuses to load the schema. Without it
the server takes its own default, which is always present — `utf8mb4_0900_ai_ci`
on MySQL 8, `utf8mb4_uca1400_ai_ci` on MariaDB 11.4, `utf8mb4_general_ci` on
MariaDB 10.11. The schema file leaves it out for the same reason.

### Load the schema

```bash
mysql -u statusengine -p statusengine < packaging/mysql_schema.sql
```

{{< callout type="info" >}}
The second `statusengine` is the **database name**, not the password. `-p` on
its own prompts for the password; a value glued to it (`-pstatusengine`) would
be the password. This trips people up often enough that the old documentation
warned about it too.
{{< /callout >}}

Every statement in the file is `CREATE TABLE IF NOT EXISTS`, so loading it is
safe more than once, and safe against a database that already has some of the
tables — it adds what is missing and leaves the rest untouched. That also makes
it the simplest way to pick up tables added by a later version.

### Point the worker at it

```yaml
mysql_dsn: "statusengine:a-password-of-your-own@tcp(127.0.0.1:3306)/statusengine?parseTime=true"
```

The format is [go-sql-driver/mysql ↗](https://github.com/go-sql-driver/mysql#dsn-data-source-name)'s,
not a URL: `user:password@tcp(host:port)/database`. Keep `parseTime=true`.

### If you grant less than everything

`GRANT ALL` on its own database is the usual answer, and the narrower grant has
one trap in it. The worker issues `SELECT`, `INSERT`, `UPDATE` and `DELETE` —
and exactly one `TRUNCATE`, to clear the status tables when the monitoring core
restarts. **`TRUNCATE TABLE` requires the `DROP` privilege**, so a grant
assembled from the four obvious verbs works perfectly until the first core
restart:

```sql
GRANT SELECT, INSERT, UPDATE, DELETE, DROP ON `statusengine`.* TO 'statusengine'@'localhost';
```

Loading the schema needs `CREATE`, `INDEX` and `ALTER` on top — or do that as
an administrative user and leave them off the worker's own account.

### What the worker does not manage

Two things in this database are yours to look after.

**Retention.** Nothing is deleted unless you run
[`statusengine-db-cleanup`](#data-retention). The check tables grow without
bound otherwise.

**Partitioning.** The history tables take partitioning well — `PARTITION BY
RANGE (start_time DIV 86400)` is the scheme the schema is written for — and the
worker neither creates nor drops a partition. If you partition, maintain it from
outside, and remember that MySQL requires every column of a unique key to be
part of the partitioning key.

{{< callout type="warning" >}}
Coming from Statusengine 3? The tables are almost the same, but not quite, and
an existing database needs a few changes before this worker writes to it — see
[Migrating from Statusengine 3](../migrating-from-3/#3-bring-the-schema-up-to-date).
{{< /callout >}}

## Performance data

Performance data arrives on its own queue, `statusngin_service_perfdata`, as a
reduced service check: host name, service description, `perf_data` and a
timestamp. Only for services with `process_performance_data`
enabled in the monitoring core. **Services only.** There is no host perfdata
queue, in the broker or here.

The worker parses that `perf_data` string into individual metrics, one per
label, and routes each of them:

```yaml
perfdata_route: mysql        # mysql | graphite | both
```

### Into MySQL

`mysql` and `both` write one row per metric into `statusengine_perfdata`:
host name, service description, label, timestamp, value and unit. It is the
default, and it is the table
[`age_perfdata`](#how-long-to-keep-what) trims. 90 days unless you say
otherwise.

### Into Graphite

`graphite` and `both` ship metrics to a Carbon plaintext receiver,
`graphite_addr`, `127.0.0.1:2003` by default. The path of each metric is four
segments:

```text
<graphite_prefix>.<hostname>.<service_description>.<label>
statusengine.web01.HTTP.time
```

`graphite_prefix` is `statusengine` by default.

{{< callout type="warning" >}}
**Every segment is sanitised.** Only
`a-z`, `A-Z`, `0-9`, `-` and `.` survive; everything else becomes `_`. Umlauts
and every other non-ASCII character included - a service called `Größe` arrives
as `Gr__e`.

A literal `^` survives too, which is not a considered decision but an inherited
one: the legacy PHP worker's character class was `/[^a-zA-Z^0-9\-\.]/`, where
the second `^` is a literal rather than a negation, and the Go worker
reproduces that byte for byte so existing metric paths keep resolving.

The `^` behavior may be changed in the future as this was a bug in the original PHP worker.
{{< /callout >}}

Metrics are buffered and flushed when the batch fills or after 250 ms,
whichever comes first:

| Flag | Effect |
|---|---|
| `graphite_batch_size` | Metrics buffered before a write, `100`. Clamped to 1000. |
| `graphite_prefix` | First path segment, `statusengine`. |
| `graphite_addr` | Carbon plaintext receiver, `127.0.0.1:2003`. |

{{< callout type="error" >}}
**Graphite fails differently from MySQL, on purpose.** A failed dial or write
logs the error and **drops that batch** — it is not retried. Retrying here would
either block the ingestion pipeline or grow the buffer without bound, so the
next flush simply re-dials and the metrics in between are gone.

An unreachable MySQL behaves the opposite way: the batch is held and the backlog
waits at the broker. So a Graphite outage costs data and a MySQL outage costs
time. [`statusengine_graphite_metrics_dropped_total`](#monitoring-the-worker) is
the series that counts it, and every increment is a metric that now exists
nowhere.
{{< /callout >}}

## Running as a systemd service

`make install-systemd` copies three units into `/etc/systemd/system` but
**does not enable** anything. `statusengine-worker.service`, plus the
[`statusengine-db-cleanup`](#data-retention) service and timer.

```bash
systemctl enable --now statusengine-worker
```

The unit is worth reading before you adapt it, because two of its settings look
like defaults somebody forgot to tighten and are neither.

### `After=`, not `Requires=`

```ini
After=network-online.target mysql.service mariadb.service gearman-job-server.service
```

These are ordering hints, not requirements. The worker survives all three being
unavailable: it retries MySQL and reconnects to the broker on its own.
`Requires=` would tie its lifetime to theirs, so a MySQL restart would take the
worker down with it. The worker has retry logic that exists to handle such scenarios.

### `TimeoutStopSec=90s` - the one setting not to shorten

On `SIGTERM` the worker stops consuming, drains the jobs still in flight and
flushes its buffers before exiting. The worst case is the sum of three bounded
waits:

| Budget   | Stage                                                                                       |
|----------|---------------------------------------------------------------------------------------------|
| 30s      | Gearman drain. The connections close in parallel, so it is 30s in total, not 30s per queue. |
| 10s      | Final bulk-insert flush.                                                                    |
| 5s       | HTTP server shutdown.                                                                       |
| **45s**  | **worst case**                                                                              |

systemd sends `SIGKILL` when `TimeoutStopSec` expires. Set below 45s it
therefore kills the worker *during* the flush, which loses exactly the buffered
rows the graceful shutdown exists to write — and the job acknowledgements with
them, so the broker redelivers them and the upserts become the only thing
between you and duplicate rows.

90s leaves headroom over that arithmetic. It is written out in the unit rather
than left to systemd's default so that raising the drain timeout has an obvious
place to be reflected.

### API keys come from a file

```ini
EnvironmentFile=-/etc/statusengine/worker.env
```

Anything on a command line is readable by every user on the machine through
`/proc`, so the [API keys](#authentication-is-always-on) belong here instead:

```bash
STATUSENGINE_API_KEYS=key-one,key-two
STATUSENGINE_API_COMMAND_KEYS=another-key
```

The leading `-` makes the file optional — the unit still starts without it.

### The rest

`Restart=always` with `RestartSec=5s`, and a hardening block that is only
possible because the worker writes nothing to disk at all — logs go to the
journal — so it runs under `ProtectSystem=strict` with a read-only filesystem.

`LimitNOFILE=65535` covers one connection per queue, the MySQL pool and every
connected WebSocket client at once. It is far above anything the worker reaches
and costs nothing to grant.

## Data retention

Nothing in the worker deletes anything. A monitoring core producing a few
thousand checks a minute fills `statusengine_hostchecks` and
`statusengine_servicechecks` faster than anything else in the schema, and
trimming them is the job of a second binary.

It goes by two names, which is worth knowing before you go looking for it:
`make build` produces it as `bin/db_cleanup`, and `make install` puts it in
`/usr/local/bin` as **`statusengine-db-cleanup`** — the name used below and in
the systemd unit.

It reads the **same configuration file** as the worker. Each binary ignores the
other's keys, so retention is configured next to everything else:

```bash
statusengine-db-cleanup -config /etc/statusengine/config.yml

# straight out of a build tree, before installing:
./bin/db_cleanup -config /etc/statusengine/config.yml
```

`make install-systemd` ships a timer for it:

```bash
systemctl enable --now statusengine-db-cleanup.timer
```

Daily, with `Persistent=true` so a missed run is caught up rather than skipped.
Retention that quietly stops running is noticed when the disk fills and
`RandomizedDelaySec=1h` keeps it off the top of the hour.

{{< callout type="warning" >}}
**In a cluster, run it on exactly one node.** The randomized delay spreads the
load within a host, not across them. Several nodes deleting from the same tables
at the same time is the realistic source of the lock contention that
[`statusengine_db_batch_retries_total`](#monitoring-the-worker) counts. If you
must run it on more than one, give each a clearly different `OnCalendar`.
{{< /callout >}}

### How long to keep what

Every value is a number of **days**, and every key is optional. Omit one and
its default below applies. The key names are the ones the PHP worker used, so an
existing `config.yml` can be carried over value for value, including its
convention:

**`0` disables cleanup of that table entirely.** Only an explicit `0` switches a
table off; a missing key falls back to the default.

| Key | Default | Cleans |
|---|---|---|
| `age_hostchecks`<br>`age_servicechecks` | 5 | `statusengine_hostchecks`, `statusengine_servicechecks`. By far the largest tables |
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
age_perfdata: 0          # perfdata_route: graphite - let Graphite handle it
```

### Deleting without hurting

Rows go in batches, each its own transaction, and two settings shape that.

**`cleanup_batch_size`** is the number of rows per `DELETE`, `5000` by default.
Smaller batches hold locks for shorter, keep the undo log small and produce
binlog events a replica can digest - at the cost of more round-trips.

**`cleanup_batch_pause`** is a duration between two batches of the same table,
`0s` by default. No pause deletes as fast as the database allows.
Set `50ms` or so if the cleanup has to share the database with live check results.

The tool stops cleanly between batches on `SIGTERM`, so it never has to be
killed mid-statement. The unit allows it 300 seconds to do that, which matters
for the first run against a database that has never been cleaned. That one can
take a while, and it is the run most likely to be interrupted.

{{< callout type="info" >}}
It is also worth mentioning that the cleanup process finds rows to delete
based on a timestamp and LIMIT, which results in a query like:

```sql
DELETE FROM statusengine_hostchecks
WHERE start_time < 1788869899
LIMIT 5000;
```
While this is a simple mechanism, it is not the most efficient for very large tables.
In case you encounter performance issues, consider using partitioning or other strategies to improve deletion performance.
{{< /callout >}}

## Monitoring the worker

The worker exports 30 Prometheus series on its own port, `metrics_listen_addr`,
`:9105` by default. That server has **no authentication of its own**! It is
meant to be reached by a trusted scraper, which means keeping the port off any
public network rather than putting a key on it.

Every series exists from the first scrape, before anything has happened, so an
alerting rule never has to cope with a metric that is missing until the first
event arrives. The one deliberate exception is `statusengine_queue_connected`,
which appears once a consumer has actually connected: a pre-created `0` would
claim an outage for every queue during startup.

The [Worker API reference](../api/) documents all metrics with the reasoning
behind each. These are the ones worth an alert:

**`statusengine_db_available` is `0`.** Bulk inserts are not reaching MySQL.
Nothing is lost while this is zero. The batch is held and the backlog waits at
the broker (queue), but nothing is draining either, so the catch-up afterwards
takes as long as it takes. This also means that the queues are filling up
which could eventually lead to Out of Memory (OOM) conditions if not addressed.

**`statusengine_queue_connected` is `0`** for a `queue_name`. That consumer has
lost its connection. This is the only series that separates *stopped* from
*idle*: both leave `messages_received_total` flat and `jobs_in_flight` at zero.
On RabbitMQ one connection carries every queue, so all of them move together; on
Gearman each queue has its own and they move independently.

**`statusengine_graphite_metrics_dropped_total` is rising.** Every increment is a
metric that is lost. Graphite fails differently from MySQL on
purpose: an unreachable Carbon is dropped rather than retried, because retrying
would stall the database path or grow the buffer without bound.

**`statusengine_queue_downtime_updates_unmatched_total` is rising.** A downtime's
START or STOP found no row to update, so the ADD that should have created it
never arrived and the event is lost - silently, because MySQL reports the UPDATE
as successful. Expect a few right after a fresh installation and none afterwards.

**`statusengine_db_batch_retries_total` is climbing steadily.** Bulk inserts
re-run after a deadlock or a lock wait timeout. The occasional one is harmless;
a steady climb means another writer is contending for the same rows, in practice
[`statusengine-db-cleanup`](#data-retention) running against a busy table.

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
flushes are triggered by the batch filling up rather than by the 250 ms ticker.
This is the same saturation, seen from the database side.

## WebSocket event stream

Everything the worker writes to MySQL it also broadcasts live on `/ws`. Nothing
is stored for a client that is not connected, this is a stream, not a backlog,
which makes it the right tool for a dashboard, a chat notifier or anything that
wants to react to a state change.

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
client that reconnects on its own needs a configured API key.

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
connects without `?topics=` receives all topics the worker consumes, which on a
large installation is a great deal of traffic.
Only subscribe to the topics you actually need is the recommended approach.

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
**dropped for that client**. The database write and every other client are
unaffected. Drops are counted per client, reported when it disconnects, and
exported as Prometheus counters.

A client that drops is a client that is too slow, or a link that is too thin.
Subscribing to fewer topics is usually the fix; reading the socket in a loop that
does no work of its own is the other.

## The /commands API

The queue runs both ways. `/commands` takes Naemon external commands over HTTP,
publishes them to the `statusngin_cmd` queue, and the
[broker module applies them to the running core](../broker/#submitting-data-to-the-core).
This way a dashboard could acknowledge a problem or force a check without a
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
privilege, so they are not the same key. Also the endpoint gets its own port, so
exposing the stream on the network does not also expose the write endpoint.

### Sending commands

The body is the broker's own envelope, unchanged. The same JSON a client would
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
| `SHUTDOWN_PROGRAM`, `SHUTDOWN_PROCESS` | Two spellings Naemon registers against the same handler. |
| `RESTART_PROGRAM`, `RESTART_PROCESS` | The same, for restart. |
| `PROCESS_FILE` | Reads a file and runs every line in it as an external command. Without this entry the rest of the list would be decoration: put `SHUTDOWN_PROGRAM` in a file and have Naemon read it. |

Notably absent are `CHANGE_*_CHECK_COMMAND` and `CHANGE_*_EVENT_HANDLER`, the
obvious route to running arbitrary code. Naemon disables those internally, so
there is nothing left to deny.

{{< callout type="warning" >}}
This is a denylist, so it protects against an accident, not against intent. A
caller holding a valid key can still `DISABLE_NOTIFICATIONS` for every host you
have. The real control is which keys exist and who holds them. Treat a
`command_api_keys` entry as root on the monitoring core.
{{< /callout >}}

## Development tooling

`make build` produces five more binaries beside the worker and the cleanup.
`make install` does **not** install them — they stay in `bin/` and they read
their fixtures from `.claude/specs/` in the repository, so they run out of a
source checkout and nowhere else.

{{< callout type="error" >}}
Four of the five **write rows** into whatever database their DSN names, and
they replay the same fixture host and service names on every run. Point them at
a **development or staging database**. `db_verifier` is the exception: it only ever
reads.
{{< /callout >}}

### simulator

Replays the recorded queue payloads through the same Router and bulk inserters
`cmd/app` wires up, at a rate you choose — so the batching behaviour can be
watched against a real MySQL rather than reasoned about.

```bash
./bin/simulator -rate 5000 -duration 15s -mysql-dsn "user:pass@tcp(127.0.0.1:3306)/statusengine-dev"
```

It hands fixture payloads straight to the handlers and never touches a broker (queue).
That is a mock only in the sense that Gearman and RabbitMQ are absent — the
decode, persist and broadcast path is the production one.

| Flag | Effect |
|---|---|
| `-rate` | Target queue messages per second across all replayed queues, `5000`. |
| `-duration` | How long to run, `15s`. `0` runs until interrupted. |
| `-workers` | Concurrent goroutines calling handlers, `16`. |
| `-queues` | Comma-separated queue names to replay. Default is all of them. |

### gearman_publisher and rabbitmq_publisher

The same idea from the other side: synthetic events for one queue, published to
a real broker (Gearman or RabbitMQ), so the whole ingestion path runs — broker, consumer, router,
inserter — with the worker as a separate process. Start the worker against the
same broker and watch it consume what these publish.

```bash
./bin/gearman_publisher -queue statusngin_hoststatus -count 1000 -server localhost:4730
./bin/rabbitmq_publisher -queue statusngin_hoststatus -count 1000 \
    -server amqp://statusengine:statusengine@127.0.0.1:5672/
```

Each queue's wire format comes from its recorded payload, used as a template.
The four queues the broker never bulks get one job per event; everything else is
cloned into batches and submitted as one `{"messages": […]}` job per batch —
the shape a real consumer expects.

`-count 1` is the useful special case: a single event never reaches the batch
threshold, so it can only be written by the 250 ms ticker. If one event lands in
the database, the ticker works.

### losstest

Proves — or disproves — that a worker stopped under load loses nothing. That is
the property a graceful shutdown exists to provide, and the one that cannot be
established by reading the code.

Every event gets its own hostname, `lt-<run-id>-<seq>`, which is also the first
column of `statusengine_hostchecks`' primary key. Two things follow, and both
are the point: **a missing sequence number is proof of a lost event**, because
nothing in the pipeline can collapse two of those rows into one; and a
redelivered job collides on that key, so MySQL rejects the whole multi-row
`INSERT` with error 1062 and the batch is dropped, which shows up as a
contiguous gap. The second is not a measurement artefact either — it is exactly
what a redelivery would do to production data.

Three commands with an interruption in the middle:

```bash
./bin/losstest -mode publish -run-id r1 -count 50000
# start the worker, let it chew through the backlog, SIGTERM it mid-run,
# then start it again and let it drain the rest
./bin/losstest -mode verify -run-id r1 -count 50000
./bin/losstest -mode cleanup -run-id r1
```

Publishing everything up front rather than trickling it in is deliberate: it
leaves a backlog at the job server, which is both the realistic restart scenario
and the one that exercises the interesting window — jobs handed over while the
consumer is already shutting down.

Read the exit code, not just the output. `verify` exits `1` when anything is
missing, so it can drive a script.

### db_verifier

A shadow-testing tool from the rewrite. It connects to two databases — one fed
by the legacy PHP worker, one by this Go worker, both consuming the same event
stream — and diffs their most recent rows table by table, column by column, to
show the two pipelines persist identical data.

```bash
./bin/db_verifier \
    -dsn-php "user:pass@tcp(127.0.0.1:3306)/statusengine_php" \
    -dsn-go  "user:pass@tcp(127.0.0.1:3306)/statusengine" \
    -limit 5000
```

It never writes to either database, which is what makes it safe to point at a
live one. `-tables` narrows the comparison; the default covers the status,
check, history, notification, acknowledgement and downtime tables.
