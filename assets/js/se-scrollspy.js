"use strict";

/* Highlights the heading you are currently reading in the right-hand table of
   contents.

   The measurement is simpler than it looks, because Hextra has already done the
   hard part. Its heading render hook emits

       <span class="hx-absolute -hx-mt-20" id="the-anchor"></span>

   inside every heading — a marker sitting exactly 80px above the heading text,
   which is what gives a fragment jump its clearance under the sticky navbar.
   Click a TOC link and that span comes to rest at viewport top, y=0, measured.
   So the reading line is y=0 and needs no navbar arithmetic of its own: the
   active entry is the last anchor that has passed it.

   Position is read on scroll rather than through an IntersectionObserver. An
   observer fires when a heading crosses a boundary, which says nothing while
   the reader is in the middle of a section longer than the viewport — the
   common case here — and would need the same positional fallback anyway. One
   rAF-throttled pass over a few dozen spans is cheaper than the bookkeeping.

   Without JavaScript the table of contents is exactly what it was: a list of
   working links. */

(function () {
  var ACTIVE = "se-toc-active";

  var toc = document.querySelector(".hextra-toc");
  if (!toc) return;

  var scroller = toc.querySelector(".hextra-scrollbar");
  var entries = [];

  Array.prototype.forEach.call(toc.querySelectorAll('a[href^="#"]'), function (link) {
    var id = decodeURIComponent(link.getAttribute("href").slice(1));
    var anchor = document.getElementById(id);
    if (anchor) entries.push({ anchor: anchor, link: link });
  });
  if (!entries.length) return;

  var active = null;

  /* A section shorter than the gap to the bottom of the page can never reach
     the reading line, so the last heading would never light up. Once the page
     is scrolled to the end, it is the one being read by definition. */
  function atBottom() {
    var doc = document.documentElement;
    return window.innerHeight + window.scrollY >= doc.scrollHeight - 2;
  }

  function pick() {
    if (atBottom()) return entries[entries.length - 1];
    var found = null;
    for (var i = 0; i < entries.length; i++) {
      /* Entries are in document order, so the first one still below the line
         ends the search. 1px of slack absorbs sub-pixel rounding. */
      if (entries[i].anchor.getBoundingClientRect().top > 1) break;
      found = entries[i];
    }
    /* Above the first heading nothing has been read yet, but an empty table of
       contents reads as broken — point at where the reader is heading. */
    return found || entries[0];
  }

  /* Only when the entry is out of sight, and never smoothly: the page is
     already moving, and a second animation chasing it looks like a glitch. */
  function reveal(link) {
    if (!scroller || scroller.scrollHeight <= scroller.clientHeight) return;
    var box = link.getBoundingClientRect();
    var frame = scroller.getBoundingClientRect();
    if (box.top < frame.top) scroller.scrollTop -= frame.top - box.top;
    else if (box.bottom > frame.bottom) scroller.scrollTop += box.bottom - frame.bottom;
  }

  function update() {
    var next = pick();
    if (next === active) return;
    if (active) {
      active.link.classList.remove(ACTIVE);
      active.link.removeAttribute("aria-current");
    }
    active = next;
    active.link.classList.add(ACTIVE);
    active.link.setAttribute("aria-current", "location");
    reveal(active.link);
  }

  var queued = false;
  function schedule() {
    if (queued) return;
    queued = true;
    requestAnimationFrame(function () {
      queued = false;
      update();
    });
  }

  window.addEventListener("scroll", schedule, { passive: true });
  window.addEventListener("resize", schedule, { passive: true });
  window.addEventListener("hashchange", schedule);
  /* Images and the mermaid diagrams settle after DOMContentLoaded and move
     every heading below them. */
  window.addEventListener("load", schedule);

  update();
})();
