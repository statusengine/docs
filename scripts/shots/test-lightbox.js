"use strict";

/* Regression test for the lightbox.

   Everything here is about state that only exists after a click, which is
   exactly what neither the build nor check-build.sh can see. The bug that
   prompted it: `overlay.hidden = true` does nothing while an author rule sets
   `display: flex`, because `[hidden]` lives in the UA stylesheet. The closed
   overlay stayed over the page, ate every click and kept its zoom-out cursor,
   and the only way out was a reload.

   Serves public/ itself, like shoot.js. Run with `make test-ui`. */

const http = require("http");
const fs = require("fs");
const path = require("path");
const { chromium } = require("playwright");

const ROOT = "/src/public";
const PORT = 8098;
const PAGE = "/v3/worker/";

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

/* Open, and whether the overlay is really gone again afterwards. */
async function overlayState(page) {
  return page.evaluate(() => {
    const o = document.querySelector(".se-lightbox");
    if (!o) return { exists: false };
    return {
      exists: true,
      open: !o.hidden,
      display: getComputedStyle(o).display,
      /* The real question: does the closed overlay still intercept clicks? */
      blocksPage:
        document.elementFromPoint(
          Math.floor(window.innerWidth / 2),
          Math.floor(window.innerHeight / 2)
        )?.closest(".se-lightbox") !== null,
    };
  });
}

(async () => {
  if (!fs.existsSync(ROOT)) {
    console.error("public/ is missing — run `make build` first.");
    process.exit(1);
  }
  await new Promise((r) => server.listen(PORT, "127.0.0.1", r));

  const browser = await chromium.launch({
    args: ["--no-sandbox", "--disable-dev-shm-usage"],
  });
  const page = await browser.newPage({ viewport: { width: 1440, height: 950 } });
  await page.goto(`http://127.0.0.1:${PORT}${PAGE}`, { waitUntil: "networkidle" });
  await page.waitForTimeout(800);

  const links = page.locator("a.se-zoom");
  const count = await links.count();
  console.log(`\nLightbox on ${PAGE} (${count} images)\n`);
  check("page has clickable images", count >= 3, `found ${count}`);

  /* Each close route gets its own image, so a route that leaves the overlay
     up is caught by the next open rather than masked by it. */
  const routes = [
    ["close button", async () => page.locator(".se-lightbox__close").click()],
    ["Escape key", async () => page.keyboard.press("Escape")],
    ["backdrop click", async () => page.mouse.click(30, 475)],
  ];

  for (let i = 0; i < routes.length; i++) {
    const [label, close] = routes[i];

    let clicked = true;
    try {
      await links.nth(i).click({ timeout: 3000 });
    } catch {
      clicked = false;
    }
    check(`image ${i + 1} accepts a click`, clicked);
    if (!clicked) break;

    await page.waitForTimeout(400);
    let s = await overlayState(page);
    check(`image ${i + 1} opens the overlay`, s.exists && s.open);

    await close();
    await page.waitForTimeout(400);
    s = await overlayState(page);
    check(`closing via ${label} hides it`, s.open === false, `display: ${s.display}`);
    check(`closing via ${label} frees the page`, s.blocksPage === false,
      "the closed overlay still covers the page");
  }

  /* Zoom toggle: a wide screenshot fitted to a small viewport must be able to
     go to its own pixel size, or the overlay shows it smaller than the page did. */
  await links.nth(0).click();
  await page.waitForTimeout(500);
  const zoom = await page.evaluate(async () => {
    const o = document.querySelector(".se-lightbox");
    const img = o.querySelector(".se-lightbox__img");
    const before = img.clientWidth;
    img.click();
    await new Promise((r) => setTimeout(r, 300));
    return { canZoom: o.classList.contains("can-zoom"), before, after: img.clientWidth };
  });
  check("wide image can zoom to native size", zoom.canZoom && zoom.after > zoom.before,
    `${zoom.before}px -> ${zoom.after}px`);

  await page.keyboard.press("Escape");
  await page.waitForTimeout(300);
  const end = await overlayState(page);
  check("Escape closes the zoomed overlay", end.open === false && end.blocksPage === false);

  await browser.close();
  server.close();

  console.log(failed === 0 ? "\nAll lightbox checks passed.\n" : `\n${failed} check(s) FAILED.\n`);
  process.exit(failed === 0 ? 0 : 1);
})();
