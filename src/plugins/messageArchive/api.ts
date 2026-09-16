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

import { Logger } from "@utils/Logger";

import { settings } from "./settings";

const logger = new Logger("MessageArchive");

export interface ArchiveEvent {
    type: "upsert" | "delete";
    messageId: string;
    channelId: string;
    guildId?: string | null;
    authorId?: string | null;
    content?: string;
    attachments?: { id: string; filename: string; url: string; }[];
    timestamp: number;
}

export interface ArchiveHistory {
    current: {
        content: string;
        attachments: { id: string; filename: string; url: string; }[];
        authorId: string | null;
        channelId: string;
        guildId: string | null;
        createdAt: number;
        updatedAt: number;
    };
    deletedAt: number | null;
    edits: { old_content: string; edited_at: number; }[];
}

function baseUrl() {
    return settings.store.serverUrl.replace(/\/+$/, "");
}

let cspChecked = false;

export async function ensureCspAllowed() {
    if (cspChecked || IS_WEB) return;

    const url = settings.store.serverUrl;
    if (await VencordNative.csp.isDomainAllowed(url, ["connect-src"])) {
        cspChecked = true;
        return;
    }

    const res = await VencordNative.csp.requestAddOverride(url, ["connect-src"], "Discord+ Message Archive");
    if (res === "ok") cspChecked = true;
    else logger.warn("CSP override for the archive server was not granted:", res);
}

function headers() {
    return {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${settings.store.token}`
    };
}

export async function sendEvents(events: ArchiveEvent[]) {
    if (!settings.store.token || !events.length) return;

    try {
        await ensureCspAllowed();
        await fetch(`${baseUrl()}/events`, {
            method: "POST",
            headers: headers(),
            body: JSON.stringify({ events })
        });
    } catch (e) {
        logger.error("Failed to send events", e);
    }
}

export async function getHistory(messageId: string): Promise<ArchiveHistory | null> {
    await ensureCspAllowed();
    const res = await fetch(`${baseUrl()}/history/${messageId}`, { headers: headers() });
    if (res.status === 404) return null;
    if (!res.ok) throw new Error(`Server responded with ${res.status}`);
    return res.json();
}

export async function clearArchive() {
    await ensureCspAllowed();
    const res = await fetch(`${baseUrl()}/clear`, {
        method: "POST",
        headers: headers()
    });
    if (!res.ok) throw new Error(`Server responded with ${res.status}`);
}
