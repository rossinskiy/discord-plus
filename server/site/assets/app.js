(function () {
    "use strict";

    var RU = document.documentElement.lang === "ru";
    var $ = function (sel, root) { return (root || document).querySelector(sel); };
    var $$ = function (sel, root) { return Array.prototype.slice.call((root || document).querySelectorAll(sel)); };
    var store = {
        get: function (k) { try { return localStorage.getItem(k); } catch (e) { return null; } },
        set: function (k, v) { try { localStorage.setItem(k, v); } catch (e) { } }
    };
    var reduceMotion = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    // ---- year
    $$("[data-year]").forEach(function (el) { el.textContent = String(new Date().getFullYear()); });

    // ---- theme
    var themeBtn = $("#theme");
    function currentTheme() {
        var set = document.documentElement.getAttribute("data-theme");
        if (set) return set;
        return window.matchMedia && window.matchMedia("(prefers-color-scheme: light)").matches ? "light" : "dark";
    }
    function paintTheme() {
        if (themeBtn) themeBtn.setAttribute("aria-pressed", String(currentTheme() === "dark"));
    }
    if (themeBtn) {
        paintTheme();
        themeBtn.addEventListener("click", function () {
            var next = currentTheme() === "light" ? "dark" : "light";
            document.documentElement.setAttribute("data-theme", next);
            store.set("dp-theme", next);
            paintTheme();
        });
    }

    // ---- mobile menu
    var menuBtn = $("#menu");
    var tabs = $("#tabs");
    if (menuBtn && tabs) {
        var closeMenu = function (focus) {
            tabs.classList.remove("open");
            menuBtn.setAttribute("aria-expanded", "false");
            if (focus) menuBtn.focus();
        };
        menuBtn.addEventListener("click", function () {
            var open = tabs.classList.toggle("open");
            menuBtn.setAttribute("aria-expanded", String(open));
        });
        document.addEventListener("keydown", function (e) {
            if (e.key === "Escape" && tabs.classList.contains("open")) closeMenu(true);
        });
        $$("a", tabs).forEach(function (a) { a.addEventListener("click", function () { closeMenu(false); }); });
    }

    // ---- top bar border and back to top
    var top = $(".top");
    var toTop = $(".to-top");
    function onScroll() {
        var y = window.scrollY || document.documentElement.scrollTop;
        if (top) top.classList.toggle("scrolled", y > 8);
        if (toTop) toTop.classList.toggle("show", y > 900);
    }
    window.addEventListener("scroll", onScroll, { passive: true });
    onScroll();
    if (toTop) toTop.addEventListener("click", function () { window.scrollTo({ top: 0, behavior: reduceMotion ? "auto" : "smooth" }); });

    // ---- notice
    var notice = $("#notice");
    if (notice) {
        if (store.get("dp-notice") === "1") notice.hidden = true;
        var ok = $("button", notice);
        if (ok) ok.addEventListener("click", function () { store.set("dp-notice", "1"); notice.hidden = true; });
    }

    // ---- copy buttons, and steps that fade as you go
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
                flash(btn, RU ? "Скопировано" : "Copied");
                markStep(btn);
            }, function () { flash(btn, RU ? "Выделите и нажмите Ctrl+C" : "Select it and press Ctrl+C"); });
        });
    });

    // ---- the story: the window on the right follows the step in the middle of the screen
    var story = $(".story");
    if (story && "IntersectionObserver" in window) {
        var steps = $$(".step", story);
        var setStep = function (step) {
            story.dataset.s = step.dataset.s;
            steps.forEach(function (s) { s.classList.toggle("on", s === step); });
        };
        var stepObserver = new IntersectionObserver(function (entries) {
            entries.forEach(function (en) { if (en.isIntersecting) setStep(en.target); });
        }, { rootMargin: "-42% 0px -42% 0px", threshold: 0 });
        steps.forEach(function (s) { stepObserver.observe(s); });
        if (steps[0]) setStep(steps[0]);
    }

    // ---- reveal blocks once as they come into view
    var reveal = $$(".rv");
    if (reveal.length) {
        if ("IntersectionObserver" in window && !reduceMotion) {
            var io = new IntersectionObserver(function (entries) {
                entries.forEach(function (en) {
                    if (en.isIntersecting) { en.target.classList.add("in"); io.unobserve(en.target); }
                });
            }, { rootMargin: "0px 0px -8% 0px", threshold: 0.12 });
            reveal.forEach(function (el) { io.observe(el); });
        } else {
            reveal.forEach(function (el) { el.classList.add("in"); });
        }
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
            shown.textContent = RU ? "Показано " + n + " из " + items.length : n + " of " + items.length + " shown";
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
