---
title: "Statusengine 3"
description: "Archived documentation for the PHP worker and the Statusengine UI of the 3.x series."
date: 2026-09-06
weight: 40
# Hugo derives a page's type from its top-level section, so pages under /v3/
# would land on Hextra's centred default layout instead of the docs layout
# with sidebar and breadcrumb. Cascade the docs type onto the whole section.
cascade:
  type: docs
---

{{< callout type="warning" >}}
**This is the documentation for Statusengine 3.x, and it is no longer
maintained.** It describes the PHP worker, which has been replaced by the
[Go worker](../docs/worker/), and it targets distributions that have reached
end of life. For a new installation, start at the
[current documentation](../docs/).
{{< /callout >}}

Statusengine 3 is the previous generation. Its worker is a PHP application that
stores status data in MySQL, CrateDB or Redis, and it ships with a web interface
of its own. Both are kept here because installations of them are still running.

{{< cards >}}
  {{< card link="worker/" title="Worker (PHP)" subtitle="The 3.x worker. Installation, database backends, configuration, cluster nodes and the update path to 3.7." >}}
  {{< card link="ui/" title="Statusengine UI" subtitle="The AngularJS web interface. Installation, Apache and Nginx configuration, user management." >}}
{{< /cards >}}

## What changed in Statusengine 4

The 4.x worker is a Go binary rather than a PHP application, and the surface it
offers is deliberately narrower:

| | Statusengine 3 | Statusengine 4 |
|---|---|---|
| Worker | PHP 7, Composer, `bin/Console.php` | Single Go binary |
| Status database | MySQL, CrateDB or Redis | MySQL |
| Performance data | MySQL, CrateDB, Elasticsearch 5–7, Graphite | MySQL, Graphite |
| Configuration | `config.yml` | `config.yaml`, plus environment variables and CLI flags |
| Web interface | Statusengine UI (bundled) | Not part of the project |

## Statusengine 2

The documentation for the 2.x series has been retired. It remains available in
the [statusengine/docs](https://github.com/statusengine/docs) repository on
GitHub for anyone who needs to build it themselves.

## Screenshots

{{< cards >}}
  {{< card image="/images/v3/screenshots/macbook/overview.png" title="Overview" subtitle="Statusengine UI on a desktop browser" >}}
  {{< card image="/images/v3/screenshots/macbook/service-details.png" title="Service details" subtitle="Check results, plugin output and graphs for a single service" >}}
  {{< card image="/images/v3/screenshots/ipad/overview.png" title="Tablet" subtitle="The same overview on a tablet" >}}
  {{< card image="/images/v3/screenshots/iphone/overview-issue.png" title="Phone" subtitle="Current issues on a phone" >}}
{{< /cards >}}
