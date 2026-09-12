"use strict";

/* Regression test for the table-of-contents scroll spy.

   Scroll position is the whole feature, so none of it is visible to the build
   or to check-build.sh: the class only exists after the page has been scrolled.
   The cases that actually break in implementations like this one are the ends —
   the top of the page, where nothing has been read yet, and the bottom, where
   the last section is often too short to reach the reading line and never
   lights up.

   Serves public/ itself, like shoot.js. Run with `make test-ui`. */

const http = require("http");
const fs = require("fs");
const path = require("path");
const { chromium } = require("playwright");

const ROOT = "/src/public";
const PORT = 8093;
/* Long, many headings, and a short final section — the awkward one. */
const PAGE = "/docs/migrating-from-3/";

const TYPES = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".svg": "image/svg+xml",
  ".woff2": "font/woff2",
  ".png": "image/png",
  ".webp": "image/webp",
};

const server = http.createServer((req, res) => {
  let p = decodeURIComponent(req.url.split("?")[0]);
  if (p.endsWith("/")) p += "index.html";
  const f = path.normalize(path.join(ROOT, p));
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

/* Which entry is lit, and whether exactly one is. */
const state = () => {
  const links = [...document.querySelectorAll('.hextra-toc a[href^="#"]')];
  const lit = links.filter((a) => a.classList.contains("se-toc-active"));
  return {
    total: links.length,
    count: lit.length,
    index: lit.length ? links.indexOf(lit[0]) : -1,
    href: lit.length ? lit[0].getAttribute("href") : null,
    colour: lit.length ? getComputedStyle(lit[0]).color : null,
    current: lit.length ? lit[0].getAttribute("aria-current") : null,
  };
};

/* Put the nth heading's anchor exactly on the reading line. */
const scrollToEntry = (n) => {
  const links = [...document.querySelectorAll('.hextra-toc a[href^="#"]')];
  const el = document.getElementById(decodeURIComponent(links[n].getAttribute("href").slice(1)));
  window.scrollTo(0, Math.round(el.getBoundingClientRect().top + window.scrollY));
};

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

  console.log(`\nTable-of-contents scroll spy on ${PAGE}`);

  const ctx = await browser.newContext({
    viewport: { width: 1600, height: 900 },
    colorScheme: "light",
  });
  const page = await ctx.newPage();
  await page.goto(base + PAGE, { waitUntil: "networkidle" });
  await page.waitForTimeout(500);

  const top = await page.evaluate(state);
  check("a table of contents with entries is present", top.total > 3, `${top.total} entries`);
  check("exactly one entry is lit at the top of the page", top.count === 1, `${top.count} lit`);
  check("and it is the first one", top.index === 0, `index ${top.index}`);
  check("the lit entry carries the brand red", top.colour === "rgb(176, 59, 45)", top.colour);
  check("and is marked as the current location", top.current === "location", String(top.current));

  /* Clicking is the case a reader trusts most: the entry they clicked has to
     be the entry that lights up. */
  await page.locator('.hextra-toc a[href^="#"]').nth(3).click();
  await page.waitForTimeout(400);
  const clicked = await page.evaluate(state);
  check("clicking an entry lights that entry", clicked.index === 3, `index ${clicked.index}`);
  check("and still only one", clicked.count === 1, `${clicked.count} lit`);

  /* Scrolling by hand, to a heading nobody clicked. */
  await page.evaluate(scrollToEntry, 5);
  await page.waitForTimeout(300);
  const scrolled = await page.evaluate(state);
  check("scrolling a heading to the reading line lights it", scrolled.index === 5, `index ${scrolled.index}`);

  /* One pixel higher the previous heading is still the one being read. */
  await page.evaluate(() => window.scrollBy(0, -3));
  await page.waitForTimeout(300);
  const justAbove = await page.evaluate(state);
  check("and three pixels short of it does not", justAbove.index === 4, `index ${justAbove.index}`);

  await page.evaluate(() => window.scrollTo(0, document.documentElement.scrollHeight));
  await page.waitForTimeout(400);
  const bottom = await page.evaluate(state);
  check(
    "the last entry lights up at the bottom of the page",
    bottom.index === bottom.total - 1,
    `index ${bottom.index} of ${bottom.total - 1}`
  );

  await ctx.close();

  /* #b03b2d is too close to the body text on the dark ground, so the dark
     theme uses the brighter tint — check it actually reaches the link. */
  const dark = await browser.newContext({
    viewport: { width: 1600, height: 900 },
    colorScheme: "dark",
  });
  const darkPage = await dark.newPage();
  await darkPage.goto(base + PAGE, { waitUntil: "networkidle" });
  await darkPage.waitForTimeout(500);
  const inDark = await darkPage.evaluate(state);
  check("dark mode uses the brighter tint", inDark.colour === "rgb(201, 80, 61)", inDark.colour);
  await dark.close();

  await browser.close();
  server.close();

  console.log(failed === 0 ? "\nAll scroll spy checks passed.\n" : `\n${failed} check(s) FAILED.\n`);
  process.exit(failed === 0 ? 0 : 1);
})();
