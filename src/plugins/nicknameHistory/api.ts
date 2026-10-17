/*
 * Vencord, a Discord client mod
 * Copyright (c) 2026 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { getArchiveToken } from "@utils/archiveToken";
import { Logger } from "@utils/Logger";

import { settings } from "./settings";

const logger = new Logger("NicknameHistory");

export interface NameChangeEvent {
    userId: string;
    guildId?: string | null;
    field: "username" | "globalName" | "nickname";
    oldValue: string | null;
    newValue: string | null;
    timestamp: number;
}

export interface NameChangeRow {
    guild_id: string | null;
    field: string;
    old_value: string | null;
    new_value: string | null;
    changed_at: number;
}

let cspChecked = false;

async function ensureCspAllowed() {
    if (cspChecked || IS_WEB) return;

    const url = settings.store.serverUrl;
    if (await VencordNative.csp.isDomainAllowed(url, ["connect-src"])) {
        cspChecked = true;
        return;
    }

    const res = await VencordNative.csp.requestAddOverride(url, ["connect-src"], "Discord+ Nickname History");
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

export async function sendNameEvents(events: NameChangeEvent[]) {
    if (!getArchiveToken(settings.store.token) || !events.length) return;

    try {
        await ensureCspAllowed();
        await fetch(`${baseUrl()}/name-events`, {
            method: "POST",
            headers: headers(),
            body: JSON.stringify({ events })
        });
    } catch (e) {
        logger.error("Failed to send name events", e);
    }
}

export async function getNameHistory(userId: string): Promise<NameChangeRow[]> {
    await ensureCspAllowed();
    const res = await fetch(`${baseUrl()}/name-history/${userId}`, { headers: headers() });
    if (!res.ok) throw new Error(`Server responded with ${res.status}`);
    const data = await res.json();
    return data.history ?? [];
}

export async function clearNameHistory() {
    await ensureCspAllowed();
    const res = await fetch(`${baseUrl()}/clear-name-history`, {
        method: "POST",
        headers: headers()
    });
    if (!res.ok) throw new Error(`Server responded with ${res.status}`);
}
