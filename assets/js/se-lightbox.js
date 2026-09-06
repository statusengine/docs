/*
  Click a screenshot to see it at full size.

  The markup already works without this file: render-image.html wraps every
  processed image in a link to a larger rendition, so with JavaScript off a
  click still opens the big image. This turns that link into an overlay.

  No dependencies, and nothing is loaded from anywhere else — the enlarged
  image is the same self-hosted WebP the link points at.
*/
(function () {
  "use strict";

  var reduced = window.matchMedia("(prefers-reduced-motion: reduce)");

  var overlay = null;
  var scroller = null;
  var figure = null;
  var image = null;
  var caption = null;
  var closeButton = null;
  var lastFocused = null;

  function build() {
    overlay = document.createElement("div");
    overlay.className = "se-lightbox";
    overlay.hidden = true;
    overlay.setAttribute("role", "dialog");
    overlay.setAttribute("aria-modal", "true");
    overlay.setAttribute("aria-label", "Enlarged image");

    closeButton = document.createElement("button");
    closeButton.type = "button";
    closeButton.className = "se-lightbox__close";
    closeButton.setAttribute("aria-label", "Close");
    /* aria-hidden so the glyph is not read out on top of the label. */
    closeButton.innerHTML = '<span aria-hidden="true">×</span>';

    /* The overlay itself must not be the scroll container: its backdrop-filter
       establishes a containing block, so a position:fixed close button inside
       it would scroll away with the content. Scrolling happens one level in. */
    scroller = document.createElement("div");
    scroller.className = "se-lightbox__scroll";

    figure = document.createElement("figure");
    figure.className = "se-lightbox__figure";

    image = document.createElement("img");
    image.className = "se-lightbox__img";
    image.alt = "";

    caption = document.createElement("figcaption");
    caption.className = "se-lightbox__caption";

    figure.appendChild(image);
    figure.appendChild(caption);
    scroller.appendChild(figure);
    overlay.appendChild(closeButton);
    overlay.appendChild(scroller);
    document.body.appendChild(overlay);

    /* A click on the backdrop closes. A click on the image itself toggles
       between fitting the viewport and the image's own pixel size — without
       that, a wide screenshot is unreadable on a phone, where fitting it to
       the screen makes it smaller than it was in the page. */
    overlay.addEventListener("click", function (e) {
      if (e.target === image) {
        toggleZoom(e);
        return;
      }
      close();
    });
    closeButton.addEventListener("click", close);
  }

  function open(link) {
    if (!overlay) build();

    lastFocused = document.activeElement;

    var text = link.getAttribute("data-caption") || "";
    image.src = link.getAttribute("href");
    image.alt = text;
    caption.textContent = text;
    caption.hidden = text === "";

    var w = parseInt(link.getAttribute("data-full-width"), 10);
    /* Never blow the image up past the pixels it actually has. */
    image.style.maxWidth = w > 0 ? w + "px" : "";

    overlay.classList.remove("is-zoomed");
    /* Whether zooming would change anything at all is only knowable once the
       browser has laid the image out. */
    image.onload = function () {
      var fits = image.clientWidth >= image.naturalWidth;
      overlay.classList.toggle("can-zoom", !fits);
    };

    overlay.hidden = false;
    document.documentElement.classList.add("se-lightbox-open");
    if (!reduced.matches) {
      /* Let the browser paint the hidden state once so the fade has a
         starting point to animate from. */
      requestAnimationFrame(function () {
        overlay.classList.add("is-open");
      });
    } else {
      overlay.classList.add("is-open");
    }
    closeButton.focus();
  }

  function toggleZoom(e) {
    if (!overlay.classList.contains("can-zoom")) return;

    var zoomingIn = !overlay.classList.contains("is-zoomed");

    /* Where on the picture the reader pointed, as a fraction. Zooming to the
       geometric centre instead would, on a wide screenshot, land on whatever
       happens to be in the middle — usually empty background. */
    var box = image.getBoundingClientRect();
    var rx = box.width ? (e.clientX - box.left) / box.width : 0.5;
    var ry = box.height ? (e.clientY - box.top) / box.height : 0.5;

    overlay.classList.toggle("is-zoomed", zoomingIn);
    if (!zoomingIn) return;

    /* The new geometry only exists after the class change has been laid out. */
    requestAnimationFrame(function () {
      var b = image.getBoundingClientRect();
      var s = scroller.getBoundingClientRect();
      scroller.scrollLeft += b.left + rx * b.width - s.left - scroller.clientWidth / 2;
      scroller.scrollTop += b.top + ry * b.height - s.top - scroller.clientHeight / 2;
    });
  }

  function close() {
    if (!overlay || overlay.hidden) return;
    overlay.classList.remove("is-open");
    overlay.classList.remove("is-zoomed");
    overlay.classList.remove("can-zoom");
    overlay.hidden = true;
    image.onload = null;
    /* Drop the source so a large image is not held in memory. */
    image.removeAttribute("src");
    document.documentElement.classList.remove("se-lightbox-open");
    if (lastFocused && lastFocused.focus) lastFocused.focus();
    lastFocused = null;
  }

  function onClick(e) {
    /* Leave modified clicks alone: opening in a new tab has to keep working. */
    if (e.defaultPrevented || e.button !== 0) return;
    if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;

    var link = e.target.closest ? e.target.closest("a[data-lightbox]") : null;
    if (!link) return;

    e.preventDefault();
    open(link);
  }

  function onKeydown(e) {
    if (!overlay || overlay.hidden) return;
    if (e.key === "Escape") {
      close();
      return;
    }
    /* Only the close button is focusable inside, so the trap is just:
       keep Tab on it. */
    if (e.key === "Tab") {
      e.preventDefault();
      closeButton.focus();
    }
  }

  function start() {
    document.addEventListener("click", onClick);
    document.addEventListener("keydown", onKeydown);
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", start);
  } else {
    start();
  }
})();
