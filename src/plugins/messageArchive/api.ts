/*
 * Vencord, a Discord client mod
 * Copyright (c) 2026 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
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

export interface ArchiveHit {
    messageId: string;
    history: ArchiveHistory;
}

// Looks in the current text and in every earlier version of an edited message, newest first.
export async function searchArchive(query: string, limit = 10): Promise<ArchiveHit[]> {
    const needle = query.trim().toLowerCase();
    if (!needle) return [];

    const hits: ArchiveHit[] = [];
    for (const [messageId, history] of await store.entries()) {
        if (isExpired(history)) continue;
        const inCurrent = history.current.content.toLowerCase().includes(needle);
        const inEdits = history.edits.some(e => e.old_content.toLowerCase().includes(needle));
        if (inCurrent || inEdits) hits.push({ messageId, history });
    }
    hits.sort((a, b) => (b.history.deletedAt ?? b.history.current.updatedAt) - (a.history.deletedAt ?? a.history.current.updatedAt));
    return hits.slice(0, limit);
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
