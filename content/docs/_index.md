---
title: "Documentation"
description: "How the Statusengine broker module, the queue and the Go worker fit together, and in which order to install them."
date: 2026-08-24
weight: 1
aliases:
  - /getting_started/
---

Statusengine decouples a Nagios or Naemon core from its database by putting a
message queue between them. Two components do the work:

{{< cards >}}
  {{< card link="broker/" title="Broker module" subtitle="C++ event broker module. Runs inside the monitoring core, publishes JSON to Gearman or RabbitMQ." >}}
  {{< card link="worker/" title="Worker" subtitle="Go daemon. Consumes the queue, writes MySQL, forwards performance data to Graphite." >}}
{{< /cards >}}

The worker also exposes an HTTP surface of its own — a live event stream, an
endpoint for external commands and Prometheus metrics:

{{< cards >}}
  {{< card link="api/" title="Worker API" subtitle="The worker's OpenAPI document: /ws, /commands and /metrics, with schemas and examples." >}}
{{< /cards >}}

## Which order to install in

Install the worker's database first, then the worker, then the broker module.
That way the queue already has a consumer when the monitoring core starts
publishing, and nothing piles up on the queue server while you finish the setup.

Already running Statusengine 3? It is an in-place upgrade — the queues and
almost all of the tables are the same — but version 4 dropped several backends,
so start here rather than with the installation:

{{< cards >}}
  {{< card link="migrating-from-3/" title="Migrating from Statusengine 3" subtitle="What version 4 removed, retiring the PHP worker's service and cronjob, the schema changes, and moving the database off utf8_general_ci." >}}
{{< /cards >}}

## Choosing a queue

The broker and the worker both speak Gearman and RabbitMQ, and both are
configured with a single key. Pick one and use it on both sides:

{{< cards >}}
  {{< card title="Gearman" subtitle="The lighter option. Run gearmand on the same node as the monitoring core so publishing stays a loopback operation." >}}
  {{< card title="RabbitMQ" subtitle="Pick this if you already run RabbitMQ, need TLS between core and queue, or want its management UI for queue depth." >}}
{{< /cards >}}

{{< callout type="info" >}}
Queues buffer in memory in both cases. The broker publishes RabbitMQ messages as
transient, so a queue server restart drops whatever has not been consumed yet —
that is deliberate, monitoring state is re-sent on the next check.
{{< /callout >}}
