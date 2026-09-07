---
title: "Worker API"
description: "The Go worker's HTTP surface: the /ws event stream, the /commands endpoint for Naemon external commands, and the Prometheus /metrics endpoint."
date: 2026-09-07
weight: 30
# The reference brings its own navigation and needs the width; the article's
# table of contents would list nothing, because the page has no headings of
# its own past this point.
width: wide
toc: false
---

The worker runs three HTTP endpoints, on three ports it binds separately:
`/ws` streams every monitoring event it processes, `/commands` accepts Naemon
external commands and puts them back on the queue for the broker module, and
`/metrics` exposes its Prometheus instrumentation. Both of the first two are
authenticated and bind to loopback unless you tell them otherwise.

{{< callout type="info" >}}
The document below is the worker's own `docs/openapi.yaml`, mirrored here
unchanged — the worker repository is the source of truth. Fetch it from
[`/api/statusengine-worker.yaml`](/api/statusengine-worker.yaml) to load it
into your own client; there is no request console here, because a call made
from this page would have to cross an origin your worker does not allow.
{{< /callout >}}

{{< openapi spec="/api/statusengine-worker.yaml" >}}
