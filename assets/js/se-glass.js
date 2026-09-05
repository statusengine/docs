/* Statusengine — the two bits of the glass layer that CSS cannot express.

   1. `se-scrolled` on <body> once the page leaves the top, so the navbar pane
      can firm up instead of letting body copy show through the text.
   2. `--se-mx` / `--se-my` on the card under the pointer, which positions the
      radial glow in .hextra-card::before.

   Everything here is decoration: with this file absent or blocked the CSS
   still renders a complete, static glass surface. */
(function () {
  "use strict";

  var reduced = window.matchMedia("(prefers-reduced-motion: reduce)");

  /* --- Navbar state ------------------------------------------------------ */

  var scrolled = null;
  function syncScroll() {
    var next = window.scrollY > 8;
    if (next === scrolled) return;
    scrolled = next;
    document.body.classList.toggle("se-scrolled", next);
  }

  /* --- Card spotlight ---------------------------------------------------- */

  /* One delegated listener rather than two per card, and at most one write
     per frame — a pointermove fires far more often than the screen redraws. */
  var pending = null;
  function paint() {
    pending = null;
    var e = paint.event;
    var card = e.target.closest ? e.target.closest(".hextra-card") : null;
    if (!card) return;
    var box = card.getBoundingClientRect();
    if (!box.width || !box.height) return;
    card.style.setProperty(
      "--se-mx",
      (((e.clientX - box.left) / box.width) * 100).toFixed(1) + "%"
    );
    card.style.setProperty(
      "--se-my",
      (((e.clientY - box.top) / box.height) * 100).toFixed(1) + "%"
    );
  }

  function onPointerMove(e) {
    paint.event = e;
    if (pending === null) pending = requestAnimationFrame(paint);
  }

  function start() {
    syncScroll();
    window.addEventListener("scroll", syncScroll, { passive: true });

    if (!reduced.matches) {
      document.addEventListener("pointermove", onPointerMove, { passive: true });
    }
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", start);
  } else {
    start();
  }
})();
