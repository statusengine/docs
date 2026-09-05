---
title: "Worker"
description: "The Go worker: consuming Gearman or RabbitMQ, bulk-inserting into MySQL, routing performance data to Graphite, and running under systemd."
date: 2026-08-24
weight: 20
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
      <a href="https://creativecommons.org/licenses/by/3.0/" target="_blank" rel="noreferrer">CC BY 3.0</a>.
    </figcaption>
  </figure>
</div>

{{< callout type="warning" >}}
This is **not** the PHP worker. Configuration, database backends and command-line
tools are all different. If you are coming from Statusengine 3.x, treat this as a
new component rather than an upgrade — the old `config.yml` will not carry over.
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

| | |
|---|---|
| Go | 1.26.5 (only to build; the result is a static binary) |
| Database | MySQL 8.0+ — the only supported database |
| Queue | Gearman **or** RabbitMQ, matching whatever the broker publishes to |
| Performance data | Graphite (Carbon plaintext), optional |

There is no PostgreSQL, CrateDB or Elasticsearch backend, and no Redis
dependency. If a guide tells you otherwise, it is describing the old PHP worker.

## Build and install

```bash
git clone https://github.com/statusengine/worker
cd worker
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

{{< callout type="warning" >}}
**Section not written yet.** It will document `db_cleanup`, the `age_*` keys with
their defaults, batching, and the caveat that the timer belongs on exactly one
node of a cluster.
{{< /callout >}}

## Monitoring the worker

{{< callout type="warning" >}}
**Section not written yet.** It will list the Prometheus metrics served on
`:9105` and which of them actually indicate trouble.
{{< /callout >}}

## WebSocket event stream

{{< callout type="warning" >}}
**Section not written yet.** It will cover `/ws`, topic subscriptions, the frame
format, and why an empty `api_keys` list generates a random key instead of
disabling authentication.
{{< /callout >}}

## Development tooling

{{< callout type="warning" >}}
**Section not written yet.** It will cover `simulator`, `gearman_publisher`,
`rabbitmq_publisher`, `db_verifier` and `losstest`.
{{< /callout >}}
