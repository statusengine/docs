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

  window.Scalar.createApiReference(mount, {
    url: mount.dataset.seSpec,
    layout: mount.dataset.seLayout || "modern",

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
