"use strict";

/* Screenshots of the built site, for reviewing the design without a browser
   on the host.
   
   It serves public/ over HTTP itself rather than pointing at the dev server:
   what gets photographed is then exactly what `make build` produced, and the
   run needs no container networking. file:// would not work — the site uses
   absolute asset paths, which resolve against the filesystem root there. */

const http = require("http");
const fs = require("fs");
const path = require("path");
const { chromium } = require("playwright");

const ROOT = "/src/public";
const OUT = "/src/.shots";
const PORT = 8099;

const TYPES = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".json": "application/json",
  ".svg": "image/svg+xml",
  ".woff2": "font/woff2",
  ".png": "image/png",
  ".webmanifest": "application/manifest+json",
  ".xml": "application/xml",
  ".txt": "text/plain; charset=utf-8",
};

/* Viewport shots. `full` captures the whole scroll height instead. */
const PAGES = [
  { name: "home", url: "/", w: 1440, h: 950 },
  { name: "home-full", url: "/", w: 1440, h: 950, full: true, settle: 2000 },
  { name: "home-mobile", url: "/", w: 390, h: 844 },
  { name: "broker", url: "/docs/broker/", w: 1440, h: 950 },
  { name: "worker", url: "/docs/worker/", w: 1440, h: 950 },
  { name: "v3", url: "/v3/", w: 1440, h: 950 },
  { name: "v3-worker", url: "/v3/worker/", w: 1440, h: 950 },
  { name: "v3-ui", url: "/v3/ui/", w: 1440, h: 950 },
  { name: "v3-worker-tabs", url: "/v3/worker/#installation", w: 1440, h: 950 },
  { name: "v3-ui-tabs", url: "/v3/ui/#nginx-example-config", w: 1440, h: 950 },
  { name: "v3-lightbox", url: "/v3/worker/#get-metrics", w: 1440, h: 950, click: "a.se-zoom" },
  { name: "v3-lightbox-mobile", url: "/v3/worker/#get-metrics", w: 390, h: 844, click: "a.se-zoom" },
  { name: "v3-lightbox-zoom", url: "/v3/worker/#get-metrics", w: 390, h: 844, click: "a.se-zoom", click2: ".se-lightbox__img" },
  { name: "tutorials", url: "/tutorials/", w: 1440, h: 950 },
  { name: "tut-naemon", url: "/tutorials/install-naemon/", w: 1440, h: 950 },
  { name: "tut-eclipse", url: "/tutorials/setup-naemon-development-environment/#configure-eclipse", w: 1440, h: 950 },
];

/* The two characters on their own, at 2x, to check proportions. */
const ART = [
  { name: "art-gopher", url: "/images/gopher-worker.svg", w: 420, h: 520 },
  { name: "art-hexagon", url: "/images/cpp-broker.svg", w: 420, h: 520 },
  { name: "art-elephant", url: "/images/php-elephant.svg", w: 420, h: 520 },
];

function resolveFile(urlPath) {
  let p = decodeURIComponent(urlPath.split("?")[0]);
  if (p.endsWith("/")) p += "index.html";
  const full = path.normalize(path.join(ROOT, p));
  return full.startsWith(ROOT) ? full : null;
}

const server = http.createServer((req, res) => {
  const file = resolveFile(req.url);
  if (!file || !fs.existsSync(file) || fs.statSync(file).isDirectory()) {
    res.writeHead(404).end("not found");
    return;
  }
  res.writeHead(200, {
    "content-type": TYPES[path.extname(file)] || "application/octet-stream",
  });
  fs.createReadStream(file).pipe(res);
});

(async () => {
  if (!fs.existsSync(ROOT)) {
    console.error("public/ is missing — run `make build` first.");
    process.exit(1);
  }
  fs.mkdirSync(OUT, { recursive: true });

  await new Promise((r) => server.listen(PORT, "127.0.0.1", r));
  const base = `http://127.0.0.1:${PORT}`;

  /* Chromium cannot use its own sandbox as an unprivileged uid inside a
     container; the container is the boundary here. */
  const browser = await chromium.launch({
    args: ["--no-sandbox", "--disable-dev-shm-usage"],
  });

  const written = [];

  for (const scheme of ["light", "dark"]) {
    for (const shot of PAGES) {
      const ctx = await browser.newContext({
        viewport: { width: shot.w, height: shot.h },
        colorScheme: scheme,
      });
      const page = await ctx.newPage();
      await page.goto(base + shot.url, { waitUntil: "networkidle" });
      /* Mermaid renders after load, and the fonts need a beat to swap in. */
      await page.waitForTimeout(shot.settle || 1200);
      /* Some states only exist after an interaction — the lightbox, say. */
      if (shot.click) {
        await page.locator(shot.click).first().click();
        await page.waitForTimeout(600);
      }
      if (shot.click2) {
        await page.locator(shot.click2).first().click();
        await page.waitForTimeout(400);
      }
      const file = `${OUT}/${scheme}-${shot.name}.png`;
      await page.screenshot({ path: file, fullPage: !!shot.full });
      written.push(file);
      await ctx.close();
    }
  }

  for (const shot of ART) {
    const ctx = await browser.newContext({
      viewport: { width: shot.w, height: shot.h },
      deviceScaleFactor: 2,
    });
    const page = await ctx.newPage();
    await page.goto(base + shot.url, { waitUntil: "networkidle" });
    await page.waitForTimeout(800);
    const file = `${OUT}/${shot.name}.png`;
    await page.screenshot({ path: file });
    written.push(file);
    await ctx.close();
  }

  await browser.close();
  server.close();

  console.log(`\n${written.length} screenshots in .shots/`);
  for (const f of written) console.log("  " + path.basename(f));
})().catch((err) => {
  console.error(err);
  process.exit(1);
});
