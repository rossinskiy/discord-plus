/*
 * Vencord, a Discord client mod
 * Copyright (c) 2026 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { createKeyedStore } from "@utils/keyedStore";

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

const store = createKeyedStore<NameChangeRow[]>("DiscordPlusNicknameHistory", { legacyKey: "NicknameHistory_data" });

export async function sendNameEvents(events: NameChangeEvent[]) {
    for (const event of events) {
        const rows = await store.get(event.userId) ?? [];
        rows.unshift({
            guild_id: event.guildId ?? null,
            field: event.field,
            old_value: event.oldValue,
            new_value: event.newValue,
            changed_at: event.timestamp
        });
        if (rows.length > MAX_HISTORY_PER_USER) rows.length = MAX_HISTORY_PER_USER;
        store.set(event.userId, rows);
    }
}

export async function getNameHistory(userId: string): Promise<NameChangeRow[]> {
    return await store.get(userId) ?? [];
}

export async function clearNameHistory() {
    await store.clear();
}
