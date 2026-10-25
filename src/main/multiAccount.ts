/*
 * Discord+, a fork of Vencord
 * Copyright (c) 2023 Vendicated and contributors
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU General Public License for more details.
 *
 * You should have received a copy of the GNU General Public License
 * along with this program.  If not, see <https://www.gnu.org/licenses/>.
*/

import { app, BrowserWindow, Input } from "electron";
import { join } from "path";

// Imported as a namespace (not destructured) so we always read the current
// value at call time — patcher.ts only assigns this once the real Discord
// window is constructed, well after this module is first evaluated.
import * as patcher from "./patcher";

const SECOND_ACCOUNT_PARTITION = "persist:discordplus-account2";

function isToggleShortcut(input: Input) {
    // input.code is the physical key position (layout-independent), unlike
    // input.key which reflects the shifted character (e.g. "@" on US layout
    // when Shift+2 is held) — so it must be checked instead of input.key.
    return input.type === "keyDown" &&
        (input.control || input.meta) &&
        input.shift &&
        input.code === "Digit2";
}

let mainWindow: BrowserWindow | null = null;
let secondWindow: BrowserWindow | null = null;
let isQuitting = false;
let creatingSecondWindow = false;
// Which account is on screen. Tracked here instead of asking isFocused(), which
// is unreliable right after a hide()/show() and made the shortcut do nothing.
let secondIsActive = false;

function createSecondWindow() {
    creatingSecondWindow = true;

    // Vencord's preload.js does `require(process.env.DISCORD_PRELOAD)` to chain
    // into Discord's own native preload after it sets itself up. This env var is
    // read at the moment the new renderer process spawns below, so it must be
    // set synchronously right before the constructor call — same trick patcher.ts
    // uses for the real window.
    if (patcher.discordPreloadPath) {
        process.env.DISCORD_PRELOAD = patcher.discordPreloadPath;
    }

    const win = new BrowserWindow({
        width: 1280,
        height: 800,
        show: false,
        autoHideMenuBar: true,
        webPreferences: {
            partition: SECOND_ACCOUNT_PARTITION,
            preload: join(__dirname, "preload.js"),
            contextIsolation: true,
            sandbox: false
        }
    });

    win.webContents.on("did-fail-load", (_e, code, desc) => {
        console.error("[MultiAccount] second window failed to load:", code, desc);
    });

    win.webContents.on("before-input-event", (event, input) => {
        if (isToggleShortcut(input)) {
            event.preventDefault();
            toggleActiveAccount();
        }
    });

    creatingSecondWindow = false;

    win.loadURL("https://discord.com/app");

    // Closing this window (Alt+F4 / titlebar X) should just hide it, like the
    // main Discord window minimizing to tray, not tear down the whole session.
    win.on("close", e => {
        if (isQuitting) return;
        e.preventDefault();
        win.hide();
        secondIsActive = false;
        if (mainWindow && !mainWindow.isDestroyed()) mainWindow.show();
    });

    return win;
}

function toggleActiveAccount() {
    if (!mainWindow || mainWindow.isDestroyed()) return;

    if (!secondWindow || secondWindow.isDestroyed()) {
        secondWindow = createSecondWindow();
    }

    if (secondIsActive) {
        secondWindow.hide();
        if (mainWindow.isMinimized()) mainWindow.restore();
        mainWindow.show();
        mainWindow.focus();
    } else {
        mainWindow.hide();
        secondWindow.show();
        secondWindow.focus();
    }
    secondIsActive = !secondIsActive;
}

export function initMultiAccount() {
    // Discord creates a splash/loading window before the real main window,
    // which gets destroyed once the real one is ready. Keep tracking the
    // latest non-destroyed window (skipping our own second window) so we
    // always end up pointing at the real main window.
    app.on("browser-window-created", (_e, win) => {
        if (creatingSecondWindow) return;
        // Only the real Discord window counts. Pop-outs, DevTools and the splash
        // screen used to replace it here, and the shortcut then hid the wrong window.
        const claim = () => {
            if (win.isDestroyed() || win === secondWindow) return;
            const url = win.webContents.getURL();
            if (/^https:\/\/([a-z]+\.)?discord\.com\/(app|channels|login)/.test(url)) mainWindow = win;
        };
        win.webContents.on("did-navigate", claim);
        win.webContents.on("did-finish-load", claim);

        win.webContents.on("before-input-event", (event, input) => {
            if (isToggleShortcut(input)) {
                event.preventDefault();
                toggleActiveAccount();
            }
        });

        win.once("closed", () => {
            if (mainWindow === win) mainWindow = null;
        });
    });

    app.on("before-quit", () => {
        isQuitting = true;
    });
}
