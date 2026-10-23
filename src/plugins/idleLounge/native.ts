/*
 * Vencord, a Discord client mod
 * Copyright (c) 2026 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { DATA_DIR } from "@main/utils/constants";
import { IpcMainInvokeEvent, shell } from "electron";
import { mkdir, readFile, rename, writeFile } from "fs/promises";
import { dirname, join } from "path";

// Next to Vencord's own data folder, in a folder of its own for Discord+.
const DIR = join(dirname(DATA_DIR), "discord-plus", "IdleLounge");
const FILE = join(DIR, "save.json");
// Where the first version of this feature wrote the save.
const OLD_FILE = join(DATA_DIR, "IdleLounge", "save.json");
const MAX_BYTES = 8 * 1024 * 1024;

export async function readSave(_: IpcMainInvokeEvent): Promise<string | null> {
    for (const file of [FILE, OLD_FILE]) {
        try {
            return await readFile(file, "utf-8");
        } catch { }
    }
    return null;
}

// Written to a temp file first so a crash mid-write can't leave a half-written save.
export async function writeSave(_: IpcMainInvokeEvent, json: string): Promise<boolean> {
    if (typeof json !== "string" || json.length > MAX_BYTES) return false;
    await mkdir(DIR, { recursive: true });
    const tmp = `${FILE}.tmp`;
    await writeFile(tmp, json, "utf-8");
    await rename(tmp, FILE);
    return true;
}

export function getSavePath(_: IpcMainInvokeEvent): string {
    return FILE;
}

export function revealSave(_: IpcMainInvokeEvent) {
    shell.showItemInFolder(FILE);
}
