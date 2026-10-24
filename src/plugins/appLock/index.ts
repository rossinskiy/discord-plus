/*
 * Vencord, a Discord client mod
 * Copyright (c) 2026 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import "./style.css";

import { Devs } from "@utils/constants";
import definePlugin from "@utils/types";

import { hasPassword, Native } from "./lock";
import { hideLock, isLocked, showLock } from "./overlay";
import { settings } from "./settings";

let lastActivity = Date.now();
let idleTimer: ReturnType<typeof setInterval> | undefined;

function matchesHotkey(e: KeyboardEvent, spec: string) {
    const parts = spec.split("+").map(p => p.trim().toLowerCase()).filter(Boolean);
    if (parts.length === 0) return false;
    const key = parts[parts.length - 1];
    const mods = parts.slice(0, -1);
    return e.ctrlKey === mods.includes("ctrl")
        && e.altKey === mods.includes("alt")
        && e.shiftKey === mods.includes("shift")
        && e.metaKey === (mods.includes("meta") || mods.includes("cmd") || mods.includes("win"))
        && e.key.toLowerCase() === key;
}

async function lockNow() {
    if (isLocked() || !(await hasPassword())) return;
    showLock();
}

function onKeyDown(e: KeyboardEvent) {
    lastActivity = Date.now();
    const spec = settings.store.lockHotkey;
    if (spec && !isLocked() && matchesHotkey(e, spec)) {
        e.preventDefault();
        e.stopPropagation();
        lockNow();
    }
}

const onActivity = () => { lastActivity = Date.now(); };

export default definePlugin({
    name: "AppLock",
    authors: [Devs.Tsar],
    description: "Asks for a password before Discord shows your chats, and locks again on a hotkey or after you are away. It stops someone sitting at your open screen. It does not protect against someone who can open your files.",
    tags: ["Privacy", "Utility"],
    settings,

    async start() {
        // Cover the screen first, then find out whether a password exists, so chats never flash.
        showLock();
        if (!(await hasPassword())) {
            Native?.setArmed(false);
            hideLock();
        }

        window.addEventListener("keydown", onKeyDown, true);
        window.addEventListener("mousedown", onActivity, true);
        window.addEventListener("mousemove", onActivity, true);
        idleTimer = setInterval(() => {
            const minutes = settings.store.idleMinutes;
            if (minutes > 0 && !isLocked() && Date.now() - lastActivity > minutes * 60_000) lockNow();
        }, 10_000);
    },

    stop() {
        window.removeEventListener("keydown", onKeyDown, true);
        window.removeEventListener("mousedown", onActivity, true);
        window.removeEventListener("mousemove", onActivity, true);
        clearInterval(idleTimer);
        hideLock();
    }
});
