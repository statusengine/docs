"use strict";

/* Proves what content/datenschutz.md promises: Matomo runs cookieless, honours
 * Do Not Track, and no request leaves the origin except to the Matomo host
 * named in hugo.yaml.
 *
 * The tracker host is not reachable from here, so matomo.js 404s or hangs —
 * that is fine and in fact the point: disableCookies() is pushed onto _paq
 * before the tracker loads, so what matters is what the page itself does. */

const http = require("http");
const fs = require("fs");
const path = require("path");
const { chromium } = require("playwright");

const ROOT = "/src/public", PORT = 8089;
const TYPES = { ".html": "text/html; charset=utf-8", ".css": "text/css", ".js": "text/javascript",
  ".svg": "image/svg+xml", ".woff2": "font/woff2", ".webp": "image/webp", ".png": "image/png",
  ".json": "application/json", ".xml": "application/xml", ".txt": "text/plain",
  ".yaml": "application/yaml", ".webmanifest": "application/manifest+json" };

const server = http.createServer((req, res) => {
  let p = path.join(ROOT, decodeURIComponent(req.url.split("?")[0]));
  if (fs.existsSync(p) && fs.statSync(p).isDirectory()) p = path.join(p, "index.html");
  if (!fs.existsSync(p)) { res.writeHead(404).end(); return; }
  res.writeHead(200, { "Content-Type": TYPES[path.extname(p)] || "application/octet-stream" });
  fs.createReadStream(p).pipe(res);
});

let failures = 0;
const check = (n, ok, d) => {
  console.log(`  ${ok ? "\x1b[32mok\x1b[0m" : "\x1b[31mFAIL\x1b[0m"}   ${n}${d ? " — " + d : ""}`);
  if (!ok) failures++;
};

(async () => {
  await new Promise((r) => server.listen(PORT, r));
  const browser = await chromium.launch({ args: ["--no-sandbox", "--disable-dev-shm-usage"] });
  const ctx = await browser.newContext();
  const page = await ctx.newPage();

  const offOrigin = [];
  page.on("request", (r) => {
    const h = new URL(r.url()).host;
    if (h !== `127.0.0.1:${PORT}`) offOrigin.push(h);
  });

  /* Block everything off-origin. Two reasons, both necessary:
     the request event above still fires, so the assertion about which hosts
     the page reaches is unaffected; and the real tracker never loads, which
     keeps this test from posting page views into production analytics every
     time it runs. It also keeps _paq a plain array — once matomo.js loads it
     replaces _paq with its own object and the queue can no longer be read. */
  await page.route("**/*", (route) => {
    const h = new URL(route.request().url()).host;
    return h === `127.0.0.1:${PORT}` ? route.continue() : route.abort();
  });

  console.log("\n\x1b[1mAnalytics do what the privacy policy says\x1b[0m");

  for (const url of ["/", "/docs/worker/", "/datenschutz/"]) {
    await page.goto(`http://127.0.0.1:${PORT}${url}`, { waitUntil: "load" });
    await page.waitForTimeout(900);
    const cookies = await ctx.cookies();
    check(`${url} sets no cookies`, cookies.length === 0,
      cookies.map((c) => c.name).join(",") || "none");
    const storage = await page.evaluate(() => {
      try { return localStorage.length + sessionStorage.length; } catch (e) { return -1; }
    });
    check(`${url} writes no web storage`, storage === 0, `entries=${storage}`);
  }

  const queued = await page.evaluate(() => {
    const q = window._paq;
    if (!Array.isArray(q)) return null;
    return q.map((e) => (Array.isArray(e) ? e[0] : String(e)));
  });
  if (queued === null) {
    check("the _paq queue is readable", false,
      "matomo.js loaded and replaced it — the off-origin block did not hold");
  }
  check("disableCookies is queued before any page view",
    !!queued && queued.indexOf("disableCookies") === 0,
    (queued || []).join(" → ") || "empty");
  check("Do Not Track is honoured", !!queued && queued.includes("setDoNotTrack"));

  const hosts = [...new Set(offOrigin)];
  /* Whatever hugo.yaml points at, read back out of the built page rather than
     hard-coded here — otherwise this test passes for the wrong host. */
  const configured = await page.evaluate(() => {
    /* Read it off the <noscript> pixel: after minification the tracker URL in
       the script itself lives in a variable, not next to setTrackerUrl. */
    const m = document.documentElement.innerHTML.match(/https?:\/\/([a-zA-Z0-9.-]+)\/matomo\.php/);
    return m ? m[1] : null;
  });
  const allowed = hosts.filter((h) => h === configured);
  check("nothing is requested off-origin except the Matomo host",
    hosts.length === allowed.length, hosts.join(",") || "no off-origin requests at all");

  /* The Impressum's details are assembled in the browser. Umlauts are the
     part worth testing: the scheme this replaced reversed the plaintext's
     bytes and could only survive them by accident. */
  await page.goto(`http://127.0.0.1:${PORT}/impressum/`, { waitUntil: "load" });
  await page.waitForTimeout(500);
  const revealed = await page.evaluate(() => {
    const lines = [...document.querySelectorAll(".se-obf")].map((e) => e.textContent);
    const mail = document.querySelector(".se-obf-mail");
    return { lines, mail: mail && mail.textContent, href: mail && mail.getAttribute("href") };
  });
  check("the address is assembled in the browser",
    revealed.lines.length >= 3 && revealed.lines.every((l) => l && l.trim().length),
    revealed.lines.join(" / "));
  check("non-ASCII survives the round trip",
    !revealed.lines.join("").includes("\uFFFD"),
    "no replacement characters");
  check("the email becomes a working mailto",
    !!revealed.mail && revealed.href === "mailto:" + revealed.mail, revealed.href);
  check("none of it is in the served markup", await (async () => {
    const html = await (await fetch(`http://127.0.0.1:${PORT}/impressum/`)).text();
    return !revealed.lines.concat([revealed.mail]).some((v) => v && html.includes(v));
  })());

  /* With scripting off the block can only be empty, so it has to be hidden
     rather than left as a hole above the notice that explains it. */
  const noJs = await browser.newContext({ javaScriptEnabled: false });
  const plain = await noJs.newPage();
  await plain.goto(`http://127.0.0.1:${PORT}/impressum/`, { waitUntil: "load" });
  const off = await plain.evaluate(() => {
    const a = document.querySelector(".se-imprint--js");
    const note = document.querySelector("noscript");
    return {
      hidden: a ? getComputedStyle(a).display === "none" : null,
      height: a ? Math.round(a.getBoundingClientRect().height) : null,
      explains: !!note && /JavaScript/.test(document.body.textContent),
    };
  });
  check("without JavaScript the empty block is hidden", off.hidden === true && off.height === 0,
    `display none=${off.hidden} height=${off.height}`);
  check("and the page says why", off.explains);
  await noJs.close();

  /* The legal pages must be reachable from every page, not just linked once. */
  await page.goto(`http://127.0.0.1:${PORT}/docs/broker/`, { waitUntil: "load" });
  for (const href of ["/impressum/", "/datenschutz/"]) {
    const found = await page.evaluate((h) => !!document.querySelector(`footer a[href="${h}"]`), href);
    check(`${href} is linked in the footer`, found);
  }

  await browser.close();
  server.close();
  console.log(failures ? `\n\x1b[31m${failures} check(s) failed.\x1b[0m\n`
                       : "\n\x1b[32mAll privacy checks passed.\x1b[0m\n");
  process.exit(failures ? 1 : 0);
})();
