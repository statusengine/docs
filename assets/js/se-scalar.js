"use strict";

/* Mounts the vendored Scalar API reference and keeps it on the site's theme.

   Scalar is mounted by hand rather than through its `<script id="api-reference">`
   auto-mount, because three of its defaults reach out to Scalar's own servers
   and the only place to turn them off is the configuration object:

     withDefaultFonts  injects @font-face rules pointing at fonts.scalar.com.
                       The site already self-hosts Inter and JetBrains Mono —
                       the very two families Scalar asks for — so switching the
                       injection off changes nothing visually.
     proxyUrl          defaults to proxy.scalar.com and would route every
                       "Test Request" (headers and API key included) through a
                       third party.
     telemetry         defaults to true. Nothing in this build reads the flag,
                       but an upgrade could change that.

   See assets/vendor/scalar/UPSTREAM.md. scripts/shots/test-api.js asserts at
   runtime that the page issues no request off this origin. */

(function () {
  var mount = document.querySelector("[data-se-scalar]");
  if (!mount) return;

  if (typeof window.Scalar === "undefined" || !window.Scalar.createApiReference) {
    mount.innerHTML =
      '<p class="se-scalar__fallback">The interactive reference could not be ' +
      'loaded. The OpenAPI document itself is at <a href="' +
      mount.dataset.seSpec +
      '">' +
      mount.dataset.seSpec +
      "</a>.</p>";
    return;
  }

  var root = document.documentElement;
  var isDark = function () {
    return root.classList.contains("dark");
  };

  /* Scalar keeps its colour mode in localStorage and lets that win over the
     `darkMode` option, so a reader who once viewed a Scalar-powered site in
     the other mode would land here with a light reference on a dark page.
     Writing the site's current mode before mounting settles it. */
  var syncStore = function () {
    try {
      window.localStorage.setItem("colorMode", isDark() ? "dark" : "light");
    } catch (e) {
      /* Private mode, or storage disabled. The class toggle below still works. */
    }
  };

  syncStore();

  var slug = mount.dataset.seSlug || "api";

  window.Scalar.createApiReference(mount, {
    url: mount.dataset.seSpec,
    layout: mount.dataset.seLayout || "modern",
    slug: slug,

    withDefaultFonts: false,
    proxyUrl: "",
    telemetry: false,

    /* "Ask AI". Left on, it queries Scalar's document registry over
       api.scalar.com the moment the reference mounts — before anyone has
       clicked anything. */
    agent: { disabled: true },

    /* Hextra supplies the page's sidebar, search and theme switch already;
       a second set inside the article would compete with them. */
    showSidebar: false,
    hideSearch: true,
    hideDarkModeToggle: true,

    /* The client would post from statusengine.org to a reader's own worker,
       which their browser blocks as a cross-origin request — the worker sends
       no CORS headers. Scalar's answer is its proxy, which is exactly what we
       refuse to use, so the button is hidden rather than left to fail. The
       document is downloadable instead: any local client can run these calls
       from a machine that can actually reach the worker. */
    hideTestRequestButton: true,
    hideClientButton: true,
    documentDownloadType: "direct",

    /* Scalar's own toolbar ("Configure", "Share", "Deploy"). Left alone it
       decides by hostname, so it stays away from statusengine.org but appears
       on every local preview — including the screenshots, which should show
       what readers get. */
    showDeveloperTools: "never",

    darkMode: isDark(),
    defaultOpenAllTags: true,
    orderRequiredPropertiesFirst: true,
  });

  /* The document links its topic table at the payload schemas as JSON
     pointers — [`HostStatusEvent`](#/components/schemas/HostStatusEvent).
     That is the renderer-neutral way to write them and no renderer resolves
     it; Scalar puts those schemas in the Models section at the foot of the
     page, under ids of the form `<slug>/models/<Name>`. Repointing the links
     here rather than editing the YAML keeps static/api/ a byte-for-byte
     mirror of the worker repository, which is where the document is
     maintained. */
  var POINTER = "#/components/schemas/";
  var MODELS = "#" + slug + "/models/";

  var anchorFor = function (href) {
    var name;
    if (href.indexOf(POINTER) === 0) name = href.slice(POINTER.length);
    else if (href.indexOf(MODELS) === 0) name = href.slice(MODELS.length);
    else return null;
    /* A pointer into a schema's innards, say .../Envelope/properties/type,
       has no anchor of its own. Leave it alone rather than guess. */
    if (!name || name.indexOf("/") !== -1) return null;
    return document.getElementById(slug + "/models/" + name);
  };

  var repointSchemaLinks = function () {
    var links = mount.querySelectorAll('a[href^="' + POINTER + '"]');
    var remaining = 0;
    Array.prototype.forEach.call(links, function (a) {
      var target = anchorFor(a.getAttribute("href"));
      if (target) a.setAttribute("href", "#" + target.id);
      else remaining++;
    });
    return { seen: links.length, remaining: remaining };
  };

  /* A jump into the Models section has to survive two things Scalar does on
     its own. It renders each schema's body only while that schema is in view
     and drops it again afterwards, so the page height swings by thousands of
     pixels for a moment after the jump — aim once and the reader ends up
     somewhere in the middle of the section list. And the re-render that
     follows replaces the node the jump aimed at, so a held reference goes
     stale and anything set on it is lost.

     Hence: for a short window, re-aim every frame at the *id*, and keep
     asking the target to open until it stays open. Both stop the instant the
     reader scrolls for themselves. */
  var SETTLE_MS = 1500;
  var REVEAL_EVERY = 10;

  var settleOn = function (id) {
    var deadline = Date.now() + SETTLE_MS;
    var frame = 0;
    var live = true;

    var stop = function () {
      live = false;
      window.removeEventListener("wheel", stop);
      window.removeEventListener("touchstart", stop);
      window.removeEventListener("keydown", stop);
    };
    window.addEventListener("wheel", stop, { passive: true });
    window.addEventListener("touchstart", stop, { passive: true });
    window.addEventListener("keydown", stop);

    var step = function () {
      if (!live) return;
      if (Date.now() > deadline) return stop();

      var target = document.getElementById(id);
      if (target) {
        /* Every model renders collapsed, and someone who followed a link
           named "HostStatusEvent" wants the schema, not a closed row with
           that name on it. Opening only adds content below the row, so the
           reader's view does not jump. */
        if (
          frame % REVEAL_EVERY === 0 &&
          target.getAttribute("aria-expanded") === "false"
        ) {
          target.click();
        }
        /* Idempotent once the layout is quiet, and "auto" rather than the
           document's scroll-behavior — an animation restarted every frame
           never arrives. scroll-margin-top in se-scalar.css is what keeps
           this clear of the sticky navbar. */
        target.scrollIntoView({ block: "start", behavior: "auto" });
      }

      frame++;
      requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  };

  mount.addEventListener("click", function (e) {
    if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey || e.button !== 0) return;
    var a = e.target.closest && e.target.closest('a[href^="#"]');
    if (!a) return;
    var target = anchorFor(a.getAttribute("href"));
    if (!target) return;
    /* The hash is set rather than pushed, so back and forward keep working
       the way they would have; settleOn then corrects the landing. */
    e.preventDefault();
    window.location.hash = target.id;
    settleOn(target.id);
  });

  /* The reference mounts asynchronously, so wait for the markup instead of
     guessing a delay. One clean pass — every link repointed, none left over —
     ends the watch. A shared link that names a schema is honoured here too:
     the browser's own jump happened long before this markup existed. */
  var linkWatcher = new MutationObserver(function () {
    var pass = repointSchemaLinks();
    if (pass.seen === 0 || pass.remaining > 0) return;
    linkWatcher.disconnect();
    var landing = anchorFor(window.location.hash);
    if (landing) settleOn(landing.id);
  });
  linkWatcher.observe(mount, { childList: true, subtree: true });

  /* Scalar writes `light-mode`/`dark-mode` onto document.body. Its own toggle
     is hidden, so the only thing that should decide those classes is the
     site's switch — but the bundle also has a DOMContentLoaded handler that
     sets them from its own defaults, and that runs after this deferred
     script. Watching <body> as well as <html> makes the mirror self-
     correcting whenever either side moves.

     No loop: classList.toggle with an explicit second argument leaves the
     attribute untouched when it already agrees, so a correcting write
     produces no further mutation record. */
  var apply = function () {
    var dark = isDark();
    document.body.classList.toggle("dark-mode", dark);
    document.body.classList.toggle("light-mode", !dark);
    syncStore();
  };

  var observer = new MutationObserver(apply);
  observer.observe(root, { attributes: true, attributeFilter: ["class"] });
  observer.observe(document.body, { attributes: true, attributeFilter: ["class"] });

  apply();
})();
