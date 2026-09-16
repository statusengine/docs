"use strict";

/* The mobile menu must trap the page behind it.
 *
 * Hextra locks scrolling by putting overflow:hidden on <body>, which only
 * works while <html> is overflow:visible — the body's overflow propagates to
 * the viewport. custom.css gives <html> its own overflow-x, so that
 * propagation stops and the lock has to be applied to <html> as well. Without
 * it the navbar scrolls out of reach and the menu can only be closed by
 * following a link. */

const http = require("http");
const fs = require("fs");
const path = require("path");
const { chromium } = require("playwright");

const ROOT = "/src/public";
const PORT = 8097;
const TYPES = {
  ".html": "text/html; charset=utf-8", ".css": "text/css", ".js": "text/javascript",
  ".svg": "image/svg+xml", ".woff2": "font/woff2", ".webp": "image/webp",
  ".png": "image/png", ".json": "application/json", ".xml": "application/xml",
  ".txt": "text/plain", ".yaml": "application/yaml", ".webmanifest": "application/manifest+json",
};

const server = http.createServer((req, res) => {
  let p = path.join(ROOT, decodeURIComponent(req.url.split("?")[0]));
  if (fs.existsSync(p) && fs.statSync(p).isDirectory()) p = path.join(p, "index.html");
  if (!fs.existsSync(p)) { res.writeHead(404).end(); return; }
  res.writeHead(200, { "Content-Type": TYPES[path.extname(p)] || "application/octet-stream" });
  fs.createReadStream(p).pipe(res);
});

let failures = 0;
function check(name, ok, detail) {
  console.log(`  ${ok ? "\x1b[32mok\x1b[0m" : "\x1b[31mFAIL\x1b[0m"}   ${name}${detail ? " — " + detail : ""}`);
  if (!ok) failures++;
}

(async () => {
  await new Promise((r) => server.listen(PORT, r));
  const browser = await chromium.launch({ args: ["--no-sandbox", "--disable-dev-shm-usage"] });

  console.log("\n\x1b[1mThe mobile menu holds the page still\x1b[0m");

  for (const url of ["/docs/worker/", "/"]) {
    const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, hasTouch: true });
    const page = await ctx.newPage();
    await page.goto(`http://127.0.0.1:${PORT}${url}`, { waitUntil: "networkidle" });

    /* Order matters, and this is the order that broke. Scrolling first leaves
       the page somewhere down the document, and only then does the menu open
       on top of it — which is when the navbar used to be yanked off-screen.
       Opening the menu at the top of the page hides the bug entirely. */
    await page.mouse.move(195, 600);
    await page.mouse.wheel(0, 2500);
    await page.waitForTimeout(350);
    const deep = await page.evaluate(() => window.scrollY);
    check(`${url} scrolls down first`, deep > 400, `scrollY=${deep}`);

    await page.click(".hamburger-menu");
    await page.waitForTimeout(350);

    const open = await page.evaluate(() =>
      document.querySelector(".hamburger-menu svg").classList.contains("open"));
    check(`${url} opens the menu`, open);

    /* A real wheel gesture, not window.scrollTo: overflow:hidden blocks the
       user but leaves the scrolling API working, so a scripted scroll would
       report a failure that nobody can actually perform.

       Twice, because on a docs page the first pass is swallowed by the nav
       panel scrolling inside the menu. Only once that bottoms out does the
       gesture chain to the document — which is exactly when the page used to
       slide out from under the open menu. */
    await page.mouse.move(195, 500);
    for (let i = 0; i < 2; i++) {
      await page.mouse.wheel(0, 4000);
      await page.waitForTimeout(300);
    }
    const scrolled = await page.evaluate(() => window.scrollY);
    check(`${url} does not scroll behind the menu`, scrolled === deep,
      `scrollY ${deep} -> ${scrolled}`);

    const navTop = await page.evaluate(() => {
      const n = document.querySelector(".nav-container");
      return n ? Math.round(n.getBoundingClientRect().top) : null;
    });
    check(`${url} keeps the navbar on screen`, navTop !== null && Math.abs(navTop) <= 1,
      `top=${navTop}`);

    /* And the hamburger is still where a thumb can reach it. */
    const hit = await page.evaluate(() => {
      const b = document.querySelector(".hamburger-menu").getBoundingClientRect();
      const el = document.elementFromPoint(b.x + b.width / 2, b.y + b.height / 2);
      return !!(el && el.closest(".hamburger-menu"));
    });
    check(`${url} leaves the button clickable`, hit);

    /* Locking the page must not lock the menu: the docs nav is taller than a
       phone screen and has to scroll inside its own panel. */
    const navScrolls = await page.evaluate(() => {
      const el = Array.from(document.querySelectorAll(".sidebar-container *"))
        .find((n) => n.scrollHeight > n.clientHeight + 8 &&
                     ["auto", "scroll"].includes(getComputedStyle(n).overflowY));
      if (!el) return null;
      el.scrollTop = 200;
      return el.scrollTop;
    });
    check(`${url} lets the menu itself scroll`, navScrolls === null || navScrolls > 0,
      navScrolls === null ? "nothing to scroll" : `scrollTop=${navScrolls}`);

    await page.click(".hamburger-menu");
    await page.waitForTimeout(350);
    const closed = await page.evaluate(() =>
      !document.querySelector(".hamburger-menu svg").classList.contains("open"));
    check(`${url} closes again`, closed);

    /* Upwards: by now the page may be sitting at the bottom of the document,
       where scrolling further down proves nothing. */
    const before = await page.evaluate(() => window.scrollY);
    await page.mouse.wheel(0, -600);
    await page.waitForTimeout(300);
    const unlocked = await page.evaluate(() => window.scrollY);
    check(`${url} releases the page afterwards`, unlocked < before,
      `scrollY ${before} -> ${unlocked}`);

    await ctx.close();
  }

  await browser.close();
  server.close();
  console.log(failures ? `\n\x1b[31m${failures} check(s) failed.\x1b[0m\n` : "\n\x1b[32mAll checks passed.\x1b[0m\n");
  process.exit(failures ? 1 : 0);
})();
