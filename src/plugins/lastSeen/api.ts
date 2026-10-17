/*
 * Vencord, a Discord client mod
 * Copyright (c) 2026 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { getArchiveToken } from "@utils/archiveToken";
import { Logger } from "@utils/Logger";

import { settings } from "./settings";

const logger = new Logger("LastSeen");

export interface PresenceEvent {
    userId: string;
    reason: "presence" | "message" | "typing";
    status?: string | null;
    channelId?: string | null;
    timestamp: number;
}

export interface PresenceHistoryRow {
    reason: string;
    status: string | null;
    channel_id: string | null;
    timestamp: number;
}

let cspChecked = false;

async function ensureCspAllowed() {
    if (cspChecked || IS_WEB) return;

    const url = settings.store.serverUrl;
    if (await VencordNative.csp.isDomainAllowed(url, ["connect-src"])) {
        cspChecked = true;
        return;
    }

    const res = await VencordNative.csp.requestAddOverride(url, ["connect-src"], "Discord+ Last Seen");
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

export async function sendPresenceEvents(events: PresenceEvent[]) {
    if (!getArchiveToken(settings.store.token) || !events.length) return;

    try {
        await ensureCspAllowed();
        await fetch(`${baseUrl()}/presence-events`, {
            method: "POST",
            headers: headers(),
            body: JSON.stringify({ events })
        });
    } catch (e) {
        logger.error("Failed to send presence events", e);
    }
}

export async function getLastSeen(userId: string): Promise<{ latest: PresenceHistoryRow; history: PresenceHistoryRow[]; } | null> {
    await ensureCspAllowed();
    const res = await fetch(`${baseUrl()}/presence/${userId}`, { headers: headers() });
    if (res.status === 404) return null;
    if (!res.ok) throw new Error(`Server responded with ${res.status}`);
    return res.json();
}

export async function clearLastSeen() {
    await ensureCspAllowed();
    const res = await fetch(`${baseUrl()}/clear-presence`, {
        method: "POST",
        headers: headers()
    });
    if (!res.ok) throw new Error(`Server responded with ${res.status}`);
}
