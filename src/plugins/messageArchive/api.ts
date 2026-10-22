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

import { createKeyedStore } from "@utils/keyedStore";

// Mirrors the old server's retention window, applied locally instead.
const MAX_AGE_MS = 7 * 24 * 60 * 60 * 1000;

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

const store = createKeyedStore<ArchiveHistory>("DiscordPlusMessageArchive", { legacyKey: "MessageArchive_data" });
let pruneTimer: ReturnType<typeof setInterval> | undefined;
let pruneStartTimer: ReturnType<typeof setTimeout> | undefined;

function isExpired(entry: ArchiveHistory) {
    return Date.now() - (entry.deletedAt ?? entry.current.updatedAt) > MAX_AGE_MS;
}

export async function sendEvents(events: ArchiveEvent[]) {
    for (const event of events) {
        const existing = await store.get(event.messageId);

        if (event.type === "delete") {
            if (existing) {
                existing.deletedAt = event.timestamp;
                store.set(event.messageId, existing);
            }
            continue;
        }

        if (!existing) {
            store.set(event.messageId, {
                current: {
                    content: event.content ?? "",
                    attachments: event.attachments ?? [],
                    authorId: event.authorId ?? null,
                    channelId: event.channelId,
                    guildId: event.guildId ?? null,
                    createdAt: event.timestamp,
                    updatedAt: event.timestamp
                },
                deletedAt: null,
                edits: []
            });
            continue;
        }

        if (event.content !== undefined && event.content !== existing.current.content) {
            existing.edits.push({ old_content: existing.current.content, edited_at: event.timestamp });
        }
        existing.current.content = event.content ?? existing.current.content;
        existing.current.attachments = event.attachments ?? existing.current.attachments;
        existing.current.updatedAt = event.timestamp;
        store.set(event.messageId, existing);
    }
}

export async function getHistory(messageId: string): Promise<ArchiveHistory | null> {
    const entry = await store.get(messageId);
    return entry && !isExpired(entry) ? entry : null;
}

export async function clearArchive() {
    await store.clear();
}

// Expired entries are only swept now and then, and well after startup, so the
// full scan never competes with Discord loading.
export function startMaintenance() {
    pruneStartTimer = setTimeout(() => {
        store.prune(isExpired);
        pruneTimer = setInterval(() => store.prune(isExpired), 60 * 60 * 1000);
    }, 2 * 60 * 1000);
}

export function stopMaintenance() {
    clearTimeout(pruneStartTimer);
    clearInterval(pruneTimer);
    store.flush();
}
