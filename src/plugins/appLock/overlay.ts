/*
 * Vencord, a Discord client mod
 * Copyright (c) 2026 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { checkPassword, Native } from "./lock";

let overlay: HTMLDivElement | null = null;
let failures = 0;
let blockedUntil = 0;
let onUnlock: (() => void) | undefined;
let watcher: MutationObserver | undefined;

export const isLocked = () => overlay != null;

function appRoot() {
    return document.getElementById("app-mount");
}

function setBackgroundInert(on: boolean) {
    const root = appRoot();
    if (!root) return;
    // Only touch the attribute when it differs: setting it again would fire the watcher again, forever.
    if (on && !root.hasAttribute("inert")) root.setAttribute("inert", "");
    else if (!on && root.hasAttribute("inert")) root.removeAttribute("inert");
}

export function showLock(afterUnlock?: () => void) {
    if (overlay) return;
    onUnlock = afterUnlock;

    const el = document.createElement("div");
    el.className = "vc-applock";
    el.setAttribute("role", "dialog");
    el.setAttribute("aria-modal", "true");
    el.setAttribute("aria-label", "Discord is locked");

    const box = document.createElement("form");
    box.className = "vc-applock-box";

    const title = document.createElement("h1");
    title.textContent = "Discord is locked";

    const input = document.createElement("input");
    input.type = "password";
    input.className = "vc-applock-input";
    input.placeholder = "Password";
    input.autocomplete = "off";
    input.setAttribute("aria-label", "Password");

    const error = document.createElement("p");
    error.className = "vc-applock-error";
    error.setAttribute("role", "alert");

    const button = document.createElement("button");
    button.type = "submit";
    button.className = "vc-applock-button";
    button.textContent = "Unlock";

    box.append(title, input, error, button);
    el.append(box);

    box.addEventListener("submit", async e => {
        e.preventDefault();
        const wait = blockedUntil - Date.now();
        if (wait > 0) {
            error.textContent = `Too many tries. Wait ${Math.ceil(wait / 1000)} seconds.`;
            return;
        }
        button.disabled = true;
        const ok = await checkPassword(input.value);
        button.disabled = false;
        if (ok) {
            failures = 0;
            hideLock();
            return;
        }
        failures++;
        input.value = "";
        error.textContent = "Wrong password.";
        if (failures >= 5) {
            blockedUntil = Date.now() + 30_000;
            failures = 0;
            error.textContent = "Wrong password. Locked for 30 seconds.";
        }
        box.classList.remove("vc-applock-shake");
        void box.offsetWidth;
        box.classList.add("vc-applock-shake");
        input.focus();
    });

    // Keep keystrokes away from anything that listens on the page behind the lock.
    el.addEventListener("keydown", e => e.stopPropagation());

    document.body.append(el);
    overlay = el;
    setBackgroundInert(true);
    Native?.setLocked(true);
    // If anything takes the lock screen out of the page while it is meant to be up, put it back.
    watcher = new MutationObserver(() => {
        if (!overlay) return;
        if (!overlay.isConnected) document.body.append(overlay);
        setBackgroundInert(true);
    });
    watcher.observe(document.documentElement, { childList: true, subtree: true, attributes: true, attributeFilter: ["inert"] });
    if (document.activeElement instanceof HTMLElement) document.activeElement.blur();
    input.focus();
}

export function hideLock() {
    watcher?.disconnect();
    watcher = undefined;
    Native?.setLocked(false);
    overlay?.remove();
    overlay = null;
    setBackgroundInert(false);
    const cb = onUnlock;
    onUnlock = undefined;
    cb?.();
}
