/* Reassembles the contact details in the Impressum.
 *
 * The other half of layouts/partials/obfuscate.html: the value in data-o is
 * base64 of the UTF-8 text with the base64 string reversed, so neither the
 * name nor the address nor the email address appears in the page source.
 *
 * Deliberately obfuscation and nothing more — it costs a harvester that reads
 * markup everything and a human two lines. The page says as much in its
 * noscript block rather than pretending the details are simply absent.
 */
(function () {
  "use strict";

  function decode(value) {
    var binary = atob(value.split("").reverse().join(""));
    var bytes = Uint8Array.from(binary, function (c) {
      return c.charCodeAt(0);
    });
    return new TextDecoder("utf-8").decode(bytes);
  }

  function reveal() {
    document.querySelectorAll(".se-obf[data-o]").forEach(function (el) {
      el.textContent = decode(el.dataset.o);
    });
    document.querySelectorAll(".se-obf-mail[data-o]").forEach(function (el) {
      var address = decode(el.dataset.o);
      el.textContent = address;
      el.href = "mailto:" + address;
    });
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", reveal);
  } else {
    reveal();
  }
})();
