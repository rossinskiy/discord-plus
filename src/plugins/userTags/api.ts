/*
 * Vencord, a Discord client mod
 * Copyright (c) 2026 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import * as DataStore from "@api/DataStore";

const STORE_KEY = "UserTags_entries";

export interface UserTagEntry {
    userId: string;
    note: string;
    tags: string[];
}

// userId -> entry, kept in memory so chat decorations can read it synchronously.
export const entries = new Map<string, UserTagEntry>();
const listeners = new Set<() => void>();

export function subscribe(fn: () => void) {
    listeners.add(fn);
    return () => { listeners.delete(fn); };
}

function emit() {
    listeners.forEach(fn => fn());
}

export async function loadEntries() {
    const stored = await DataStore.get<UserTagEntry[]>(STORE_KEY) ?? [];
    entries.clear();
    for (const entry of stored) entries.set(entry.userId, entry);
    emit();
}

async function persist() {
    await DataStore.set(STORE_KEY, [...entries.values()]);
}

export async function saveEntry(userId: string, note: string, tags: string[]) {
    const cleanTags = [...new Set(tags.map(t => t.trim()).filter(Boolean))];
    if (!note && !cleanTags.length) entries.delete(userId);
    else entries.set(userId, { userId, note, tags: cleanTags });

    await persist();
    emit();
}
