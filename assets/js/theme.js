// Light / Dark / System theme toggle.
//
// Project override of themes/hextra/assets/js/theme.js. Upstream's toggle has
// two states and writes "color-theme" to localStorage on the very first click.
// From then on the page is pinned and never follows the operating system
// again, with no way back through the UI. This version cycles through three
// states and reaches "system" by *removing* the key, which is exactly the
// condition the inline script in the theme's head.html already tests for — so
// that file needs no changes and there is still no flash of the wrong theme.
(function () {
  const defaultTheme = '{{ site.Params.theme.default | default `system` }}';
  const KEY = "color-theme";
  const ORDER = ["system", "light", "dark"];

  const media = window.matchMedia("(prefers-color-scheme: dark)");
  const buttons = document.querySelectorAll(".theme-toggle");

  const setDarkTheme = () => {
    document.documentElement.classList.add("dark");
    document.documentElement.style.colorScheme = "dark";
  };
  const setLightTheme = () => {
    document.documentElement.classList.remove("dark");
    document.documentElement.style.colorScheme = "light";
  };

  // The stored value is the user's *choice*; absence of it means "follow the
  // system", which is also what an untouched installation does.
  const currentChoice = () => {
    const stored = localStorage.getItem(KEY);
    return stored === "light" || stored === "dark" ? stored : "system";
  };

  const resolve = (choice) => {
    if (choice === "light" || choice === "dark") return choice;
    if (defaultTheme === "light" || defaultTheme === "dark") return defaultTheme;
    return media.matches ? "dark" : "light";
  };

  const apply = (choice) => {
    if (choice === "system") {
      localStorage.removeItem(KEY);
    } else {
      localStorage.setItem(KEY, choice);
    }
    resolve(choice) === "dark" ? setDarkTheme() : setLightTheme();
    render(choice);
  };

  const render = (choice) => {
    buttons.forEach((el) => {
      el.dataset.theme = choice;
      el.dataset.resolved = resolve(choice);
      const next = ORDER[(ORDER.indexOf(choice) + 1) % ORDER.length];
      el.setAttribute("aria-label", "Theme: " + choice + ". Switch to " + next + ".");
    });
  };

  render(currentChoice());

  buttons.forEach((el) => {
    el.addEventListener("click", () => {
      apply(ORDER[(ORDER.indexOf(currentChoice()) + 1) % ORDER.length]);
    });
  });

  // Only meaningful while the choice is "system" — a pinned light or dark
  // theme deliberately ignores what the operating system does.
  media.addEventListener("change", () => {
    if (currentChoice() === "system") apply("system");
  });
})();
