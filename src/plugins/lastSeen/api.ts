/*
 * Vencord, a Discord client mod
 * Copyright (c) 2026 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { createKeyedStore } from "@utils/keyedStore";

const MAX_HISTORY_PER_USER = 50;

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

const store = createKeyedStore<PresenceHistoryRow[]>("DiscordPlusLastSeen", { legacyKey: "LastSeen_data" });

export async function sendPresenceEvents(events: PresenceEvent[]) {
    for (const event of events) {
        const rows = await store.get(event.userId) ?? [];
        rows.unshift({
            reason: event.reason,
            status: event.status ?? null,
            channel_id: event.channelId ?? null,
            timestamp: event.timestamp
        });
        if (rows.length > MAX_HISTORY_PER_USER) rows.length = MAX_HISTORY_PER_USER;
        store.set(event.userId, rows);
    }
}

export async function getLastSeen(userId: string): Promise<{ latest: PresenceHistoryRow; history: PresenceHistoryRow[]; } | null> {
    const history = await store.get(userId);
    if (!history?.length) return null;
    return { latest: history[0], history };
}

export async function clearLastSeen() {
    await store.clear();
}
