"use strict";

/* Regression test for the self-hosted API reference.

   The point of it is the privacy rule in CLAUDE.md: no CDNs, everything from
   our own server. Scalar's bundle ships three defaults that break that —
   web fonts from fonts.scalar.com, a request proxy at proxy.scalar.com, and a
   telemetry flag — and all three are switched off in configuration, not in
   the bundle. A grep over public/ cannot see any of it, because none of those
   URLs appear in the HTML: they live inside 3.6 MB of vendored JavaScript and
   only turn into requests once the renderer runs.

   So this drives a real browser and watches the wire. Every request the page
   makes must land on the local server; anything else fails the run.

   Serves public/ itself, like shoot.js. Run with `make test-api`. */

const http = require("http");
const fs = require("fs");
const path = require("path");
const { chromium } = require("playwright");

const ROOT = "/src/public";
const PORT = 8097;
const PAGE = "/docs/api/";
const SPEC = "/api/statusengine-worker.yaml";

const TYPES = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".json": "application/json",
  ".yaml": "application/yaml; charset=utf-8",
  ".svg": "image/svg+xml",
  ".woff2": "font/woff2",
  ".png": "image/png",
  ".webp": "image/webp",
};

const served = [];

const server = http.createServer((req, res) => {
  let p = decodeURIComponent(req.url.split("?")[0]);
  if (p.endsWith("/")) p += "index.html";
  const f = path.normalize(path.join(ROOT, p));
  served.push(p);
  if (!f.startsWith(ROOT) || !fs.existsSync(f) || fs.statSync(f).isDirectory()) {
    res.writeHead(404).end("not found");
    return;
  }
  res.writeHead(200, {
    "content-type": TYPES[path.extname(f)] || "application/octet-stream",
  });
  fs.createReadStream(f).pipe(res);
});

let failed = 0;
function check(name, ok, detail) {
  console.log(`  ${ok ? "ok  " : "FAIL"}  ${name}${ok || !detail ? "" : "  — " + detail}`);
  if (!ok) failed++;
}

(async () => {
  if (!fs.existsSync(path.join(ROOT, PAGE, "index.html"))) {
    console.error(`${PAGE} is missing — run \`make build\` first.`);
    process.exit(1);
  }

  await new Promise((r) => server.listen(PORT, "127.0.0.1", r));
  const base = `http://127.0.0.1:${PORT}`;

  const browser = await chromium.launch({
    args: ["--no-sandbox", "--disable-dev-shm-usage"],
  });
  const ctx = await browser.newContext({
    viewport: { width: 1440, height: 950 },
    colorScheme: "light",
  });
  const page = await ctx.newPage();

  /* Every request the page attempts, whether or not it succeeds. A blocked
     or failed request still proves the attempt was made. */
  const offOrigin = [];
  page.on("request", (req) => {
    const url = req.url();
    if (!url.startsWith(base) && !url.startsWith("data:") && !url.startsWith("blob:")) {
      offOrigin.push(url);
    }
  });

  const consoleErrors = [];
  page.on("console", (msg) => {
    if (msg.type() === "error") consoleErrors.push(msg.text());
  });
  page.on("pageerror", (err) => consoleErrors.push(String(err)));

  console.log(`\nAPI reference on ${PAGE}`);

  await page.goto(base + PAGE, { waitUntil: "networkidle" });

  /* Scalar fetches and parses 76 KB of YAML before it renders anything, so
     wait for content rather than for the network to go quiet. The info
     section comes first; the operations are further down and are only
     rendered once they come into view, hence the scroll below. */
  const intro = await page
    .locator("text=Live event stream and operational metrics")
    .first()
    .waitFor({ timeout: 30000 })
    .then(() => true, () => false);
  check("reference renders the document", intro);

  const state = await page.evaluate(() => {
    const app = document.querySelector(".se-scalar");
    return {
      mounted: !!app && app.children.length > 0,
      bodyClass: document.body.className,
      /* Scalar injects its stylesheet at runtime; if our overrides lost the
         specificity fight this is Scalar's blue instead of the brand red. */
      accent: getComputedStyle(document.body).getPropertyValue("--scalar-color-accent").trim(),
      fontFaces: [...document.styleSheets]
        .flatMap((s) => {
          try {
            return [...s.cssRules];
          } catch (e) {
            return [];
          }
        })
        .filter((r) => r.constructor.name === "CSSFontFaceRule")
        .map((r) => r.style.getPropertyValue("src")),
    };
  });

  check("container is mounted", state.mounted);
  check("brand colour reaches the reference", state.accent === "#b03b2d", `--scalar-color-accent is "${state.accent}"`);
  check("light mode mirrored onto <body>", /\blight-mode\b/.test(state.bodyClass), state.bodyClass);

  const remoteFaces = state.fontFaces.filter((src) => /https?:\/\//.test(src));
  check("no @font-face points at a remote host", remoteFaces.length === 0, remoteFaces.join(", "));

  /* The site's own switch is the only one on the page; Scalar's is hidden.
     Flipping the class is exactly what se-scalar.js listens for. */
  await page.evaluate(() => document.documentElement.classList.add("dark"));
  await page.waitForTimeout(300);
  const dark = await page.evaluate(() => ({
    body: document.body.className,
    stored: window.localStorage.getItem("colorMode"),
  }));
  check("dark mode follows the site toggle", /\bdark-mode\b/.test(dark.body) && !/\blight-mode\b/.test(dark.body), dark.body);
  check("scalar's stored colour mode kept in step", dark.stored === "dark", `localStorage.colorMode = ${dark.stored}`);

  /* Scalar renders operations lazily, so this scroll is what brings them into
     existence — and it is also where a request to Scalar's servers would be
     triggered if one of the opt-outs above stopped working. */
  await page.evaluate(async () => {
    for (let y = 0; y < document.body.scrollHeight; y += 700) {
      window.scrollTo(0, y);
      await new Promise((r) => setTimeout(r, 80));
    }
  });
  await page.waitForTimeout(1500);

  for (const [what, text] of [
    ["the /ws handshake", "Open the event WebSocket connection"],
    ["the /commands endpoint", "Submit Naemon external commands"],
    ["the /metrics endpoint", "Prometheus metrics"],
  ]) {
    const seen = await page.locator(`text=${text}`).first().count();
    check(`${what} is documented`, seen > 0, `no "${text}" on the page`);
  }

  const toolbar = await page.locator(".api-reference-toolbar").count();
  check("Scalar's developer toolbar stays off", toolbar === 0);

  /* The document links its topic table at the payload schemas with JSON
     pointers, which Scalar does not resolve — every one of those links used to
     go nowhere. se-scalar.js repoints them at the Models section. */
  const links = await page.evaluate(() => ({
    pointers: document.querySelectorAll('a[href^="#/components/schemas/"]').length,
    repointed: document.querySelectorAll('a[href^="#api/models/"]').length,
    targets: document.querySelectorAll('[id^="api/models/"]').length,
  }));
  check("no schema link is left as an unresolvable JSON pointer", links.pointers === 0, `${links.pointers} still pointing at #/components/schemas/`);
  check("the topic table links at the Models section", links.repointed === 12, `${links.repointed} repointed links`);
  check("every model has an anchor to land on", links.targets >= 12, `${links.targets} model anchors`);

  await page.evaluate(() => window.scrollTo(0, 0));
  await page.waitForTimeout(400);
  await page.locator('a[href="#api/models/HostStatusEvent"]').first().click();
  await page.waitForTimeout(2200);
  const landed = await page.evaluate(() => {
    const el = document.getElementById("api/models/HostStatusEvent");
    if (!el) return null;
    return {
      top: Math.round(el.getBoundingClientRect().top),
      expanded: el.getAttribute("aria-expanded"),
      navbar: parseFloat(getComputedStyle(document.documentElement).fontSize) * 4,
    };
  });
  /* Landing at 0 would put the heading under the sticky navbar, and landing
     hundreds of pixels off is the drift from Scalar re-rendering the section
     list after the jump. */
  check(
    "the schema link lands on its schema, clear of the navbar",
    !!landed && landed.top > landed.navbar && landed.top < landed.navbar + 40,
    landed ? `heading at ${landed.top}px, navbar is ${landed.navbar}px` : "target missing"
  );
  check("and opens it", !!landed && landed.expanded === "true", landed ? `aria-expanded=${landed.expanded}` : "");

  check("the OpenAPI document was fetched from this origin", served.includes(SPEC), served.filter((p) => p.includes("api")).join(", ") || "never requested");
  check("no request left this origin", offOrigin.length === 0, offOrigin.join(", "));

  /* Vue's hydration and Scalar's own warnings are noisy enough to be worth
     seeing, but only a genuine failure should break the build. */
  const hard = consoleErrors.filter((e) => !/DevTools|favicon/i.test(e));
  check("no page errors", hard.length === 0, hard.slice(0, 3).join(" | "));

  await ctx.close();

  /* The document's markdown tables are wider than a phone. They are allowed to
     scroll inside themselves; the page is not. */
  const narrow = await browser.newContext({
    viewport: { width: 390, height: 844 },
    colorScheme: "light",
  });
  const small = await narrow.newPage();
  await small.goto(base + PAGE, { waitUntil: "networkidle" });
  await small.waitForTimeout(5000);
  await small.evaluate(async () => {
    for (let y = 0; y < document.body.scrollHeight; y += 700) {
      window.scrollTo(0, y);
      await new Promise((r) => setTimeout(r, 60));
    }
  });
  const overflow = await small.evaluate(() => ({
    scroll: document.documentElement.scrollWidth,
    view: document.documentElement.clientWidth,
  }));
  check(
    "no horizontal page scroll at 390px",
    overflow.scroll <= overflow.view + 1,
    `${overflow.scroll}px of content in a ${overflow.view}px viewport`
  );
  await narrow.close();

  await browser.close();
  server.close();

  console.log(failed === 0 ? "\nAll API reference checks passed.\n" : `\n${failed} check(s) FAILED.\n`);
  process.exit(failed === 0 ? 0 : 1);
})();
