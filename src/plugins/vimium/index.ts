/*
 * Vencord, a Discord client mod
 * Copyright (c) 2026 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { definePluginSettings } from "@api/Settings";
import { Devs } from "@utils/constants";
import { t } from "@utils/i18n";
import definePlugin, { OptionType } from "@utils/types";

import { hintLabels, matching } from "./hints";

const settings = definePluginSettings({
    alphabet: {
        type: OptionType.STRING,
        description: t("Letters used for the hints, easiest to reach first"),
        default: "asdfghjkl"
    }
});

const CLICKABLE = 'a[href], button, [role="button"], [role="tab"], [role="menuitem"], [role="treeitem"], [role="switch"], [role="checkbox"], [role="option"], [tabindex]:not([tabindex="-1"])';
const MAX_HINTS = 150;
const SCROLL_STEP = 140;

let layer: HTMLDivElement | undefined;
let targets: HTMLElement[] = [];
let labels: string[] = [];
let tags: HTMLElement[] = [];
let typed = "";

function inField(target: EventTarget | null) {
    const el = target as HTMLElement | null;
    return !!el && (el.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(el.tagName) || el.getAttribute?.("role") === "textbox");
}

function visibleTargets(): HTMLElement[] {
    const seen: HTMLElement[] = [];
    for (const el of document.querySelectorAll<HTMLElement>(CLICKABLE)) {
        const r = el.getBoundingClientRect();
        if (r.width < 4 || r.height < 4 || r.bottom < 0 || r.right < 0 || r.top > innerHeight || r.left > innerWidth) continue;
        if (getComputedStyle(el).visibility === "hidden") continue;
        seen.push(el);
        if (seen.length >= MAX_HINTS) break;
    }
    return seen;
}

function closeHints() {
    layer?.remove();
    layer = undefined;
    targets = [];
    labels = [];
    tags = [];
    typed = "";
}

function openHints() {
    closeHints();
    targets = visibleTargets();
    labels = hintLabels(targets.length, settings.store.alphabet);
    if (!labels.length) return closeHints();

    layer = document.createElement("div");
    layer.style.cssText = "position:fixed;inset:0;z-index:99999;pointer-events:none;";
    tags = targets.map((el, i) => {
        const r = el.getBoundingClientRect();
        const tag = document.createElement("span");
        tag.textContent = labels[i].toUpperCase();
        tag.style.cssText = `position:fixed;left:${Math.max(0, r.left)}px;top:${Math.max(0, r.top)}px;padding:0 3px;font:700 11px/16px monospace;color:#000;background:#ffd84d;border:1px solid #b38f00;border-radius:3px;`;
        layer!.appendChild(tag);
        return tag;
    });
    document.body.appendChild(layer);
}

function onKeydown(e: KeyboardEvent) {
    if (e.ctrlKey || e.metaKey || e.altKey) return;

    if (layer) {
        e.preventDefault();
        e.stopPropagation();
        if (e.key === "Escape") return closeHints();
        if (e.key === "Backspace") typed = typed.slice(0, -1);
        else if (e.key.length === 1) typed += e.key.toLowerCase();
        else return;

        const hits = matching(labels, typed);
        if (!hits.length) return closeHints();
        tags.forEach((tag, i) => { tag.style.display = hits.includes(i) ? "" : "none"; });
        if (hits.length === 1 && labels[hits[0]] === typed) {
            const el = targets[hits[0]];
            closeHints();
            el.click();
            el.focus?.();
        }
        return;
    }

    if (inField(e.target) || document.querySelector('[role="dialog"], [class*="layerContainer"] [class*="menu"]') && e.key !== "f") return;
    if (e.key === "f") {
        e.preventDefault();
        openHints();
    } else if (e.key === "j" || e.key === "k") {
        const scroller = document.querySelector<HTMLElement>('[class*="chatContent"] [class*="scroller"]');
        if (!scroller) return;
        e.preventDefault();
        scroller.scrollBy({ top: e.key === "j" ? SCROLL_STEP : -SCROLL_STEP });
    }
}

export default definePlugin({
    name: "Vimium",
    authors: [Devs.Tsar],
    description: "Keyboard navigation like the Vimium browser extension. Press f to put a letter on every clickable thing on screen, type the letters to click it, Esc to cancel. Press j and k to scroll the chat down and up. The keys do nothing while you are typing in a text box.",
    tags: ["Shortcuts", "Accessibility"],
    settings,

    start() {
        document.addEventListener("keydown", onKeydown, true);
    },

    stop() {
        document.removeEventListener("keydown", onKeydown, true);
        closeHints();
    }
});
