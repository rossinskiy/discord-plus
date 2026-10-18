/*
 * Vencord, a Discord client mod
 * Copyright (c) 2026 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import * as DataStore from "@api/DataStore";

const STORE_KEY = "LastSeen_data";
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

type Store = Record<string, PresenceHistoryRow[]>;

export async function sendPresenceEvents(events: PresenceEvent[]) {
    if (!events.length) return;

    const store: Store = await DataStore.get(STORE_KEY) ?? {};
    for (const event of events) {
        const rows = store[event.userId] ?? (store[event.userId] = []);
        rows.unshift({
            reason: event.reason,
            status: event.status ?? null,
            channel_id: event.channelId ?? null,
            timestamp: event.timestamp
        });
        if (rows.length > MAX_HISTORY_PER_USER) rows.length = MAX_HISTORY_PER_USER;
    }
    await DataStore.set(STORE_KEY, store);
}

export async function getLastSeen(userId: string): Promise<{ latest: PresenceHistoryRow; history: PresenceHistoryRow[]; } | null> {
    const store: Store = await DataStore.get(STORE_KEY) ?? {};
    const history = store[userId];
    if (!history?.length) return null;
    return { latest: history[0], history };
}

export async function clearLastSeen() {
    await DataStore.set(STORE_KEY, {});
}
