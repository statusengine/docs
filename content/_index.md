---
title: "Statusengine"
description: "Every Naemon or Nagios event, stored and streamed: a C++ broker module publishes status data to Gearman or RabbitMQ, and a Go worker writes it to MySQL, forwards performance data to Graphite and streams it live over WebSocket."
date: 2026-08-24
layout: hextra-home
toc: false
---

<div class="se-hero">
  <span class="se-hero__eyebrow">Naemon &amp; Nagios, event by event</span>

  <!-- The glow is an absolutely positioned duplicate inside the emphasis
       element, so the emphasised part has to be one word that never wraps: at
       the mobile clamp floor that is roughly twelve characters. See
       .se-hero__glow in assets/css/custom.css. -->
  <h1 class="se-hero__title">Every monitoring event, stored and <em><span class="se-hero__glow" aria-hidden="true">streamed</span>streamed</em></h1>

  <p class="se-hero__lead">
    Statusengine takes every event out of your monitoring core the moment it
    happens and hands it to a message queue. A Go worker drains that queue:
    history and current state into MySQL, performance data into Graphite, and a
    live WebSocket stream for anything that wants the events as they arrive.
  </p>

  <div class="se-hero__actions">
    <a class="se-btn se-btn--primary" href="docs/">Read the documentation</a>
    <a class="se-btn se-btn--ghost" href="https://github.com/statusengine" target="_blank" rel="noreferrer">Source on GitHub</a>
  </div>
</div>

<div class="se-section-label">The three moving parts</div>

{{< cards >}}
  {{< card link="docs/broker/" title="Broker module" subtitle="A small C++ library loaded into Naemon or Nagios Core. It picks up status data through the NEB callback API, encodes it as JSON, and publishes it to Gearman or RabbitMQ." >}}
  {{< card link="docs/worker/" title="Worker" subtitle="A Go daemon that consumes the queue, writes to MySQL in throttled bulk inserts, routes performance data to Graphite, and exposes a live WebSocket stream." >}}
  {{< card title="Queue" subtitle="Gearman or RabbitMQ sits between the two. Both are supported by broker and worker alike, and the choice is a single configuration key on each side." >}}
{{< /cards >}}

<div class="se-section-label">How data flows</div>

```mermaid
flowchart LR
  core["Naemon / Nagios Core"] -->|NEB callbacks| broker["Broker module<br/>libstatusengine.so"]
  broker -->|JSON| queue{{"Gearman<br/>or RabbitMQ"}}
  queue --> worker["Statusengine Worker<br/>(Go)"]
  worker -->|bulk INSERT| mysql[("MySQL")]
  worker -->|perfdata| graphite[("Graphite")]
  worker -->|live events| ws["WebSocket clients"]
  worker -.->|external commands| queue
  queue -.-> broker
```

The dotted path back to the core is what makes the queue two-way: the worker can
accept external commands over HTTP and publish them onto the command queue, and
the broker consumes them and hands them to the monitoring core.

<div class="se-section-label">Why a queue at all</div>

{{< cards >}}
  {{< card title="The core never blocks" subtitle="Publishing to Gearman or RabbitMQ is a local, non-blocking hand-off. Database maintenance, a full disk, or a restarted worker no longer delay check execution." >}}
  {{< card title="Spread the load" subtitle="Several monitoring nodes can publish into the same queue, and several workers can drain it. Adding capacity means adding a process, not resizing a server." >}}
  {{< card title="Bulk, not row by row" subtitle="The broker batches events into bulk messages and the worker writes them in batched INSERTs, so the database sees a fraction of the statements it would otherwise." >}}
{{< /cards >}}

<div class="se-section-label">Start here</div>

{{< cards >}}
  {{< card link="docs/broker/" title="Install the broker module" subtitle="Build it with Meson and load it into your monitoring core." >}}
  {{< card link="docs/worker/" title="Install the worker" subtitle="Build the Go binaries, point them at MySQL, run them under systemd." >}}
  {{< card link="tutorials/" title="Tutorials" subtitle="Step-by-step guides for the pieces around Statusengine." >}}
{{< /cards >}}
