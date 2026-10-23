// Runs before the page paints so the chosen theme never flashes.
(function () {
    try {
        var saved = localStorage.getItem("dp-theme");
        if (saved === "light" || saved === "dark") document.documentElement.setAttribute("data-theme", saved);
    } catch (e) { }
    document.documentElement.className = document.documentElement.className.replace("no-js", "js");
})();
