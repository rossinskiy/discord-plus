(function () {
    "use strict";

    var $ = function (sel, root) { return (root || document).querySelector(sel); };
    var $$ = function (sel, root) { return Array.prototype.slice.call((root || document).querySelectorAll(sel)); };
    var store = {
        get: function (k) { try { return localStorage.getItem(k); } catch (e) { return null; } },
        set: function (k, v) { try { localStorage.setItem(k, v); } catch (e) { } }
    };

    // ---- year
    $$("[data-year]").forEach(function (el) { el.textContent = String(new Date().getFullYear()); });

    // ---- theme
    var themeBtn = $("#theme");
    function currentTheme() {
        var set = document.documentElement.getAttribute("data-theme");
        if (set) return set;
        return window.matchMedia && window.matchMedia("(prefers-color-scheme: light)").matches ? "light" : "dark";
    }
    function paintThemeLabel() {
        if (themeBtn) themeBtn.textContent = "Theme: " + (currentTheme() === "light" ? "Light" : "Dark");
    }
    if (themeBtn) {
        paintThemeLabel();
        themeBtn.addEventListener("click", function () {
            var next = currentTheme() === "light" ? "dark" : "light";
            document.documentElement.setAttribute("data-theme", next);
            store.set("dp-theme", next);
            paintThemeLabel();
        });
    }

    // ---- mobile menu
    var menuBtn = $("#menu");
    var tabs = $("#tabs");
    if (menuBtn && tabs) {
        menuBtn.addEventListener("click", function () {
            var open = tabs.classList.toggle("open");
            menuBtn.setAttribute("aria-expanded", String(open));
        });
        document.addEventListener("keydown", function (e) {
            if (e.key === "Escape" && tabs.classList.contains("open")) {
                tabs.classList.remove("open");
                menuBtn.setAttribute("aria-expanded", "false");
                menuBtn.focus();
            }
        });
    }

    // ---- scroll progress and back to top
    var bar = $(".progress i");
    var toTop = $(".to-top");
    function onScroll() {
        var max = document.documentElement.scrollHeight - window.innerHeight;
        var y = window.scrollY || document.documentElement.scrollTop;
        if (bar) bar.style.transform = "scaleX(" + (max > 0 ? Math.min(1, y / max) : 0) + ")";
        if (toTop) toTop.classList.toggle("show", y > 700);
    }
    window.addEventListener("scroll", onScroll, { passive: true });
    onScroll();
    if (toTop) toTop.addEventListener("click", function () { window.scrollTo({ top: 0 }); });

    // ---- notice
    var notice = $("#notice");
    if (notice) {
        if (store.get("dp-notice") === "1") notice.hidden = true;
        var ok = $("button", notice);
        if (ok) ok.addEventListener("click", function () { store.set("dp-notice", "1"); notice.hidden = true; });
    }

    // ---- copy buttons, and steps that grey out as you go
    function commandText(btn) {
        var box = btn.closest(".cmd");
        var code = box && $("code", box);
        if (!code) return "";
        var clone = code.cloneNode(true);
        $$(".prompt", clone).forEach(function (p) { p.remove(); });
        return clone.textContent.trim();
    }
    function copy(text) {
        if (navigator.clipboard && window.isSecureContext) return navigator.clipboard.writeText(text);
        return new Promise(function (resolve, reject) {
            var ta = document.createElement("textarea");
            ta.value = text;
            ta.style.position = "fixed";
            ta.style.opacity = "0";
            document.body.appendChild(ta);
            ta.select();
            try { document.execCommand("copy") ? resolve() : reject(); } catch (e) { reject(e); } finally { ta.remove(); }
        });
    }
    function markStep(btn) {
        var li = btn.closest(".steps > li");
        if (!li) return;
        var items = $$(":scope > li", li.parentElement);
        var idx = items.indexOf(li);
        items.forEach(function (item, i) {
            item.classList.toggle("done", i <= idx);
            item.classList.toggle("next", i === idx + 1);
        });
    }
    var timers = new WeakMap();
    function flash(btn, text) {
        if (!btn.dataset.label) btn.dataset.label = btn.innerHTML;
        btn.textContent = text;
        clearTimeout(timers.get(btn));
        timers.set(btn, setTimeout(function () { btn.innerHTML = btn.dataset.label; }, 1800));
    }
    $$("[data-copy]").forEach(function (btn) {
        btn.addEventListener("click", function () {
            copy(commandText(btn)).then(function () {
                flash(btn, "Copied");
                markStep(btn);
            }, function () { flash(btn, "Select it and press Ctrl+C"); });
        });
    });

    // ---- home: the plugin menu
    var menu = $("#plugin-menu");
    if (menu) {
        var rows = $$(".row", menu);
        var helpTitle = $("#help-title");
        var helpBody = $("#help-body");
        var count = $("#on-count");
        var toggles = rows.filter(function (r) { return r.hasAttribute("data-toggle"); });

        rows.forEach(function (r, i) { r.style.setProperty("--i", String(i)); });
        menu.classList.add("scan");
        setTimeout(function () { menu.classList.remove("scan"); }, 900);

        var select = function (row) {
            rows.forEach(function (r) { r.removeAttribute("aria-current"); });
            row.setAttribute("aria-current", "true");
            var src = $("#help-" + row.dataset.help);
            if (src && helpBody) {
                helpTitle.textContent = src.dataset.title;
                helpBody.innerHTML = src.innerHTML;
            }
        };
        var paint = function () {
            var on = toggles.filter(function (r) { return r.dataset.on === "true"; }).length;
            if (count) count.textContent = on + " of " + toggles.length;
        };
        var setState = function (row, on) {
            row.dataset.on = String(on);
            row.setAttribute("aria-pressed", String(on));
            var val = $(".val", row);
            val.textContent = on ? "[Enabled]" : "[Disabled]";
            val.dataset.on = String(on);
        };

        rows.forEach(function (row) {
            row.addEventListener("mouseenter", function () { select(row); });
            row.addEventListener("focus", function () { select(row); });
            row.addEventListener("click", function (e) {
                if (row.tagName === "A") return;
                e.preventDefault();
                select(row);
                if (row.hasAttribute("data-toggle")) {
                    setState(row, row.dataset.on !== "true");
                    paint();
                }
            });
        });

        menu.addEventListener("keydown", function (e) {
            var i = rows.indexOf(document.activeElement);
            if (i < 0) return;
            if (e.key === "ArrowDown" || e.key === "ArrowUp") {
                e.preventDefault();
                rows[(i + (e.key === "ArrowDown" ? 1 : -1) + rows.length) % rows.length].focus();
            }
        });

        document.addEventListener("keydown", function (e) {
            if (e.ctrlKey || e.metaKey || e.altKey) return;
            if (e.key === "F10") {
                e.preventDefault();
                var cmdBtn = $("#install-copy");
                if (cmdBtn) cmdBtn.click();
            } else if (e.key === "Escape" && !(tabs && tabs.classList.contains("open"))) {
                toggles.forEach(function (r) { setState(r, false); });
                paint();
            }
        });

        if (rows[0]) select(rows[0]);
        paint();
    }

    // ---- plugin catalog: open a row, filter by typing
    var catalog = $("#catalog");
    if (catalog) {
        var items = $$(".item", catalog);
        var input = $("#filter");
        var shown = $("#shown");
        var empty = $("#none");

        var setOpen = function (item, open) {
            var btn = $(".row", item);
            btn.setAttribute("aria-expanded", String(open));
            btn.classList.toggle("open", open);
            $(".detail", item).hidden = !open;
        };
        items.forEach(function (item) {
            $(".row", item).addEventListener("click", function () {
                setOpen(item, $(".row", item).getAttribute("aria-expanded") !== "true");
            });
        });

        var apply = function () {
            var q = input.value.trim().toLowerCase();
            var n = 0;
            items.forEach(function (item) {
                var hit = !q || item.dataset.search.indexOf(q) !== -1;
                item.hidden = !hit;
                if (hit) n++;
            });
            $$(".group", catalog).forEach(function (g) {
                g.hidden = !$$(".item", g).some(function (i) { return !i.hidden; });
            });
            shown.textContent = n + " of " + items.length + " shown";
            empty.hidden = n !== 0;
        };
        input.addEventListener("input", apply);
        input.addEventListener("keydown", function (e) {
            if (e.key === "Escape") { input.value = ""; apply(); }
        });
        apply();

        if (location.hash) {
            var target = $(location.hash);
            if (target && target.classList.contains("item")) {
                setOpen(target, true);
                setTimeout(function () { target.scrollIntoView(); }, 50);
            }
        }
    }

    // ---- keep campaign tags when moving around the site
    var utm = {};
    new URLSearchParams(location.search).forEach(function (v, k) { if (k.indexOf("utm_") === 0) utm[k] = v; });
    if (Object.keys(utm).length) {
        $$("a[href^='/']").forEach(function (a) {
            var url = new URL(a.getAttribute("href"), location.origin);
            Object.keys(utm).forEach(function (k) { url.searchParams.set(k, utm[k]); });
            a.setAttribute("href", url.pathname + url.search + url.hash);
        });
    }
})();
