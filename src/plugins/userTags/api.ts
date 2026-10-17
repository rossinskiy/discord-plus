/*
 * Vencord, a Discord client mod
 * Copyright (c) 2026 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { getArchiveToken } from "@utils/archiveToken";
import { Logger } from "@utils/Logger";

import { settings } from "./settings";

const logger = new Logger("UserTags");

export interface UserTagEntry {
    userId: string;
    note: string;
    tags: string[];
}

// userId -> entry, kept in memory so chat decorations can read it synchronously.
export const entries = new Map<string, UserTagEntry>();
const listeners = new Set<() => void>();

export function subscribe(fn: () => void) {
    listeners.add(fn);
    return () => { listeners.delete(fn); };
}

function emit() {
    listeners.forEach(fn => fn());
}

let cspChecked = false;

async function ensureCspAllowed() {
    if (cspChecked || IS_WEB) return;

    const url = settings.store.serverUrl;
    if (await VencordNative.csp.isDomainAllowed(url, ["connect-src"])) {
        cspChecked = true;
        return;
    }

    const res = await VencordNative.csp.requestAddOverride(url, ["connect-src"], "Discord+ User Tags");
    if (res === "ok") cspChecked = true;
    else logger.warn("CSP override for the archive server was not granted:", res);
}

function baseUrl() {
    return settings.store.serverUrl.replace(/\/+$/, "");
}

function headers() {
    return {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${getArchiveToken(settings.store.token)}`
    };
}

export async function loadEntries() {
    if (!getArchiveToken(settings.store.token)) return;

    try {
        await ensureCspAllowed();
        const res = await fetch(`${baseUrl()}/user-tags`, { headers: headers() });
        if (!res.ok) throw new Error(`Server responded with ${res.status}`);

        const data: { entries: UserTagEntry[]; } = await res.json();
        entries.clear();
        for (const entry of data.entries) entries.set(entry.userId, entry);
        emit();
    } catch (e) {
        logger.error("Failed to load user tags", e);
    }
}

export async function saveEntry(userId: string, note: string, tags: string[]) {
    await ensureCspAllowed();
    const res = await fetch(`${baseUrl()}/user-tags/${userId}`, {
        method: "PUT",
        headers: headers(),
        body: JSON.stringify({ note, tags })
    });
    if (!res.ok) throw new Error(`Server responded with ${res.status}`);

    // Mirror the server's normalisation closely enough for the UI.
    const cleanTags = [...new Set(tags.map(t => t.trim()).filter(Boolean))];
    if (!note && !cleanTags.length) entries.delete(userId);
    else entries.set(userId, { userId, note, tags: cleanTags });
    emit();
}
