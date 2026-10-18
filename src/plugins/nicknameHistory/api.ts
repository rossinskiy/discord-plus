/*
 * Vencord, a Discord client mod
 * Copyright (c) 2026 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import * as DataStore from "@api/DataStore";

const STORE_KEY = "NicknameHistory_data";
const MAX_HISTORY_PER_USER = 50;

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

type Store = Record<string, NameChangeRow[]>;

export async function sendNameEvents(events: NameChangeEvent[]) {
    if (!events.length) return;

    const store: Store = await DataStore.get(STORE_KEY) ?? {};
    for (const event of events) {
        const rows = store[event.userId] ?? (store[event.userId] = []);
        rows.unshift({
            guild_id: event.guildId ?? null,
            field: event.field,
            old_value: event.oldValue,
            new_value: event.newValue,
            changed_at: event.timestamp
        });
        if (rows.length > MAX_HISTORY_PER_USER) rows.length = MAX_HISTORY_PER_USER;
    }
    await DataStore.set(STORE_KEY, store);
}

export async function getNameHistory(userId: string): Promise<NameChangeRow[]> {
    const store: Store = await DataStore.get(STORE_KEY) ?? {};
    return store[userId] ?? [];
}

export async function clearNameHistory() {
    await DataStore.set(STORE_KEY, {});
}
