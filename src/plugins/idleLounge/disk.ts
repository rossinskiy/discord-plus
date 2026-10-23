/*
 * Vencord, a Discord client mod
 * Copyright (c) 2026 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import type { PluginNative } from "@utils/types";

// Not there when running in a browser, in which case the save just lives in the browser.
const Native = VencordNative?.pluginHelpers?.IdleLounge as PluginNative<typeof import("./native")> | undefined;

export interface DiskSave {
    version: number;
    savedAt: number;
    game?: Record<string, any>;
    stats?: Record<string, any>;
}

let timer: ReturnType<typeof setTimeout> | undefined;
let pending: (() => DiskSave) | undefined;

export const diskAvailable = () => !!Native;

export async function readDisk(): Promise<DiskSave | null> {
    try {
        const raw = await Native?.readSave();
        return raw ? JSON.parse(raw) : null;
    } catch {
        return null;
    }
}

async function writeNow(data: DiskSave) {
    try {
        await Native?.writeSave(JSON.stringify(data));
    } catch (e) {
        console.warn("[IdleLounge] could not write the save file", e);
    }
}

// Several changes in a short time turn into one write.
export function scheduleDiskWrite(snapshot: () => DiskSave, delay = 4000) {
    if (!Native) return;
    pending = snapshot;
    if (timer) return;
    timer = setTimeout(() => {
        timer = undefined;
        const fn = pending;
        pending = undefined;
        if (fn) writeNow(fn());
    }, delay);
}

export async function flushDiskWrite(snapshot: () => DiskSave) {
    if (!Native) return;
    clearTimeout(timer);
    timer = undefined;
    pending = undefined;
    await writeNow(snapshot());
}

export const savePath = () => Native?.getSavePath() ?? Promise.resolve("");
export const revealSavePath = () => Native?.revealSave();
