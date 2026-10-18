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

import * as DataStore from "@api/DataStore";

const STORE_KEY = "MessageArchive_data";
// Mirrors the old server's retention window, applied locally on read/write instead.
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

type Store = Record<string, ArchiveHistory>;

function isExpired(entry: ArchiveHistory, now: number) {
    return now - (entry.deletedAt ?? entry.current.updatedAt) > MAX_AGE_MS;
}

async function loadStore(): Promise<Store> {
    const store: Store = await DataStore.get(STORE_KEY) ?? {};
    const now = Date.now();
    let changed = false;
    for (const id of Object.keys(store)) {
        if (isExpired(store[id], now)) {
            delete store[id];
            changed = true;
        }
    }
    if (changed) await DataStore.set(STORE_KEY, store);
    return store;
}

export async function sendEvents(events: ArchiveEvent[]) {
    if (!events.length) return;

    const store = await loadStore();
    for (const event of events) {
        if (event.type === "delete") {
            const entry = store[event.messageId];
            if (entry) entry.deletedAt = event.timestamp;
            continue;
        }

        const existing = store[event.messageId];
        if (!existing) {
            store[event.messageId] = {
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
            };
            continue;
        }

        if (event.content !== undefined && event.content !== existing.current.content) {
            existing.edits.push({ old_content: existing.current.content, edited_at: event.timestamp });
        }
        existing.current.content = event.content ?? existing.current.content;
        existing.current.attachments = event.attachments ?? existing.current.attachments;
        existing.current.updatedAt = event.timestamp;
    }
    await DataStore.set(STORE_KEY, store);
}

export async function getHistory(messageId: string): Promise<ArchiveHistory | null> {
    const store = await loadStore();
    return store[messageId] ?? null;
}

export async function clearArchive() {
    await DataStore.set(STORE_KEY, {});
}
