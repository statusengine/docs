---
title: "Tutorials"
description: "Step-by-step guides for the monitoring core, queue server, database and graphing stack that Statusengine talks to."
date: 2026-08-24
weight: 30
---

Step-by-step guides for the pieces that surround Statusengine — the monitoring
core, the queue server, the database and the graphing stack. The
[documentation](../docs/) covers Statusengine's own components; these pages cover
everything you need standing before those components have anything to talk to.

{{< callout type="info" >}}
No tutorials have been written for the new site yet. They are being rewritten
against current distributions rather than carried over — the guides on the old
site target Ubuntu 20.04 and CentOS 8 at the latest.
{{< /callout >}}

## Planned

{{< cards >}}
  {{< card title="Install Naemon" subtitle="Building a current Naemon core from source, ready for the broker module's headers." >}}
  {{< card title="Install Nagios Core" subtitle="The same, for Nagios Core." >}}
  {{< card title="Set up Gearman" subtitle="Running gearmand alongside the monitoring core." >}}
  {{< card title="Set up RabbitMQ" subtitle="A RabbitMQ node for Statusengine, including a user and vhost." >}}
  {{< card title="Set up MySQL" subtitle="Database, user and schema for the worker." >}}
  {{< card title="Graphite and Grafana" subtitle="A performance-data backend and a place to look at it." >}}
{{< /cards >}}
