(function () {
    "use strict";

    var root = document.documentElement;

    function store(key, value) {
        try {
            if (value === undefined) return localStorage.getItem(key);
            localStorage.setItem(key, value);
        } catch (e) {
            return null;
        }
    }

    // Theme
    var saved = store("dp-theme");
    if (saved === "light" || saved === "dark") root.setAttribute("data-theme", saved);

    function currentTheme() {
        var explicit = root.getAttribute("data-theme");
        if (explicit) return explicit;
        return window.matchMedia("(prefers-color-scheme: light)").matches ? "light" : "dark";
    }

    var themeBtns = document.querySelectorAll(".theme-toggle");
    themeBtns.forEach(function (btn) {
        btn.addEventListener("click", function () {
            var next = currentTheme() === "dark" ? "light" : "dark";
            root.setAttribute("data-theme", next);
            store("dp-theme", next);
        });
    });

    // Mobile menu
    var menuBtn = document.querySelector(".menu-toggle");
    var nav = document.getElementById("site-nav");
    if (menuBtn && nav) {
        menuBtn.addEventListener("click", function () {
            var open = nav.classList.toggle("is-open");
            menuBtn.setAttribute("aria-expanded", String(open));
        });
        document.addEventListener("keydown", function (e) {
            if (e.key === "Escape" && nav.classList.contains("is-open")) {
                nav.classList.remove("is-open");
                menuBtn.setAttribute("aria-expanded", "false");
                menuBtn.focus();
            }
        });
        nav.addEventListener("click", function (e) {
            if (e.target.closest("a")) {
                nav.classList.remove("is-open");
                menuBtn.setAttribute("aria-expanded", "false");
            }
        });
    }

    // Copy buttons
    document.querySelectorAll(".copy-btn").forEach(function (btn) {
        btn.addEventListener("click", function () {
            var block = btn.closest(".code-block");
            var pre = block && block.querySelector("pre");
            if (!pre) return;
            var text = pre.innerText.replace(/^\$ /gm, "").trim();

            function done() {
                btn.classList.add("is-copied");
                btn.setAttribute("aria-label", "Copied");
                setTimeout(function () {
                    btn.classList.remove("is-copied");
                    btn.setAttribute("aria-label", "Copy to clipboard");
                }, 1800);
            }

            function legacyCopy() {
                var ta = document.createElement("textarea");
                ta.value = text;
                ta.setAttribute("readonly", "");
                ta.className = "visually-hidden";
                document.body.appendChild(ta);
                ta.select();
                try {
                    if (document.execCommand("copy")) done();
                } catch (e) { }
                document.body.removeChild(ta);
            }

            if (navigator.clipboard && navigator.clipboard.writeText) {
                navigator.clipboard.writeText(text).then(done, legacyCopy);
            } else {
                legacyCopy();
            }
        });
    });

    // Back to top
    var toTop = document.querySelector(".to-top");
    if (toTop) {
        var onScroll = function () {
            toTop.classList.toggle("is-visible", window.scrollY > 600);
        };
        window.addEventListener("scroll", onScroll, { passive: true });
        onScroll();
        toTop.addEventListener("click", function () {
            window.scrollTo({ top: 0 });
        });
    }

    // Cookie notice (the site sets no cookies; this only remembers the theme and this notice)
    var cookie = document.querySelector(".cookie");
    if (cookie) {
        if (store("dp-notice") !== "1") cookie.hidden = false;
        var ok = cookie.querySelector("button");
        if (ok) {
            ok.addEventListener("click", function () {
                store("dp-notice", "1");
                cookie.hidden = true;
            });
        }
    }

    // Footer year
    document.querySelectorAll("[data-year]").forEach(function (el) {
        el.textContent = String(new Date().getFullYear());
    });

    // Plugin filter
    var search = document.getElementById("plugin-search");
    if (search) {
        var plugins = Array.prototype.slice.call(document.querySelectorAll(".plugin"));
        var empty = document.getElementById("plugin-empty");
        var apply = function () {
            var q = search.value.trim().toLowerCase();
            var shown = 0;
            plugins.forEach(function (p) {
                var match = !q || p.textContent.toLowerCase().indexOf(q) !== -1;
                p.hidden = !match;
                if (match) shown++;
            });
            if (empty) empty.hidden = shown !== 0;
        };
        search.addEventListener("input", apply);
    }
})();
