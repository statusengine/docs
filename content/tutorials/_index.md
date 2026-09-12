---
title: "Tutorials"
description: "Step-by-step guides for the monitoring core, queue server, database and graphing stack that Statusengine talks to."
date: 2026-08-24
weight: 30
# Hugo derives a page's type from its top-level section, so pages under
# /tutorials/ would land on Hextra's centred default layout instead of the docs
# layout with sidebar and breadcrumb. Same cascade as /v3/.
cascade:
  type: docs
---

Step-by-step guides for the pieces that surround Statusengine — the monitoring
core, the queue server, the database and the graphing stack. The
[documentation](../docs/) covers Statusengine's own components; these pages
cover what needs to be standing before those components have anything to talk
to.

{{< cards >}}
  {{< card link="install-naemon/" title="Install Naemon Core on Ubuntu" subtitle="Build Naemon from source on Ubuntu 26.04 LTS, ready for the broker module." >}}
  {{< card link="install-nagios/" title="Install Nagios Core on Ubuntu" subtitle="The same, for Nagios Core — the other monitoring core the broker module supports." >}}
  {{< card link="gearman-to-many-files/" title="Gearman: Too many open files" subtitle="Raise the file descriptor limit when the job server stalls past a few hundred workers." >}}
  {{< card link="setup-naemon-development-environment/" title="Naemon development environment" subtitle="Build, run and debug Naemon Core inside Eclipse, with Valgrind attached." >}}
  {{< card link="php-composer/" title="Install PHP Composer" subtitle="Only needed for Statusengine 3 — the Go worker has no PHP anywhere in it." >}}
{{< /cards >}}

## Guides from the Statusengine 3 site

The remaining guides from the old site were not carried over. Most of them
target Ubuntu 20.04 or CentOS 8 at the latest, and several cover backends the
[Go worker](../docs/worker/) no longer supports — CrateDB, Elasticsearch and
Redis. They remain in the
[statusengine/docs ↗](https://github.com/statusengine/docs/tree/master/src/content/tutorials)
repository as Markdown.
