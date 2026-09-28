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

import { app, BrowserWindow, globalShortcut } from "electron";

const SECOND_ACCOUNT_PARTITION = "persist:discordplus-account2";
const TOGGLE_SHORTCUT = "CommandOrControl+Shift+2";

let mainWindow: BrowserWindow | null = null;
let secondWindow: BrowserWindow | null = null;
let isQuitting = false;

function createSecondWindow() {
    const win = new BrowserWindow({
        width: 1280,
        height: 800,
        show: false,
        autoHideMenuBar: true,
        webPreferences: {
            partition: SECOND_ACCOUNT_PARTITION,
            contextIsolation: true,
            sandbox: false
        }
    });

    win.loadURL("https://discord.com/app");

    // Closing this window (Alt+F4 / titlebar X) should just hide it, like the
    // main Discord window minimizing to tray, not tear down the whole session.
    win.on("close", e => {
        if (isQuitting) return;
        e.preventDefault();
        win.hide();
    });

    return win;
}

function toggleActiveAccount() {
    if (!mainWindow || mainWindow.isDestroyed()) return;

    if (!secondWindow || secondWindow.isDestroyed()) {
        secondWindow = createSecondWindow();
    }

    const secondIsActive = secondWindow.isVisible() && secondWindow.isFocused();

    if (secondIsActive) {
        secondWindow.hide();
        mainWindow.show();
        mainWindow.focus();
    } else {
        mainWindow.hide();
        secondWindow.show();
        secondWindow.focus();
    }
}

export function initMultiAccount() {
    // The first BrowserWindow Electron creates is Discord's own main window;
    // we just need a reference to it to be able to show/hide it later.
    app.once("browser-window-created", (_e, win) => {
        mainWindow = win;
    });

    app.whenReady().then(() => {
        globalShortcut.register(TOGGLE_SHORTCUT, toggleActiveAccount);
    });

    app.on("before-quit", () => {
        isQuitting = true;
    });

    app.on("will-quit", () => {
        globalShortcut.unregister(TOGGLE_SHORTCUT);
    });
}
