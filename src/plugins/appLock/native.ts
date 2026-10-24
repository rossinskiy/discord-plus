/*
 * Vencord, a Discord client mod
 * Copyright (c) 2026 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { RendererSettings } from "@main/settings";
import { DATA_DIR } from "@main/utils/constants";
import { app, IpcMainInvokeEvent, WebContents,webContents } from "electron";
import { mkdirSync, readFileSync, writeFileSync } from "fs";
import { join } from "path";

// The lock screen is part of the page, and DevTools can delete any part of the page.
// So while Discord is locked, DevTools are shut from here, in the main process, where
// the page cannot reach. The file remembers whether a password is set, so DevTools stay
// shut from the very first moment of the next start, before the page has loaded.
const STATE_FILE = join(DATA_DIR, "appLock.json");

function readArmed() {
    try {
        return JSON.parse(readFileSync(STATE_FILE, "utf-8")).armed === true;
    } catch {
        return false;
    }
}

const pluginEnabled = () => RendererSettings.store.plugins?.AppLock?.enabled === true;

let locked = pluginEnabled() && readArmed();

const hooked = new WeakSet<WebContents>();

function isDevToolsKey(input: Electron.Input) {
    if (input.type !== "keyDown") return false;
    const key = input.key.toLowerCase();
    if (key === "f12") return true;
    // Ctrl+Shift+I / J / C, and Cmd+Option+I / J / C on macOS.
    const combo = (input.control && input.shift) || (input.meta && input.alt);
    return combo && (key === "i" || key === "j" || key === "c");
}

function hook(wc: WebContents) {
    if (hooked.has(wc)) return;
    hooked.add(wc);
    wc.on("before-input-event", (event, input) => {
        if (locked && isDevToolsKey(input)) event.preventDefault();
    });
    wc.on("devtools-opened", () => {
        if (locked) wc.closeDevTools();
    });
}

function closeAllDevTools() {
    for (const wc of webContents.getAllWebContents()) {
        if (wc.isDevToolsOpened()) wc.closeDevTools();
    }
}

app.on("web-contents-created", (_e, wc) => hook(wc));
for (const wc of webContents.getAllWebContents()) hook(wc);

export function setLocked(_: IpcMainInvokeEvent, value: boolean) {
    locked = value && pluginEnabled();
    if (locked) closeAllDevTools();
}

export function setArmed(_: IpcMainInvokeEvent, armed: boolean) {
    try {
        mkdirSync(DATA_DIR, { recursive: true });
        writeFileSync(STATE_FILE, JSON.stringify({ armed }));
    } catch (err) {
        console.error("[AppLock] could not save state", err);
    }
}
