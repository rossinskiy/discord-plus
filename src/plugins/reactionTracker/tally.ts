/*
 * Vencord, a Discord client mod
 * Copyright (c) 2026 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

export interface TallyRow { userId: string; count: number; }

/** Counts how many of the given user lists each user appears in, most first. */
export function tally(lists: string[][]): TallyRow[] {
    const counts = new Map<string, number>();
    for (const list of lists)
        for (const id of new Set(list)) counts.set(id, (counts.get(id) ?? 0) + 1);
    return [...counts].map(([userId, count]) => ({ userId, count }))
        .sort((a, b) => b.count - a.count || a.userId.localeCompare(b.userId));
}

/** Turns "<:name:123>" or a plain emoji into the form Discord's reactions endpoint expects. */
export function emojiParam(input: string): string | null {
    const text = input.trim();
    if (!text) return null;
    const custom = /^<a?:(\w+):(\d+)>$/.exec(text);
    return encodeURIComponent(custom ? `${custom[1]}:${custom[2]}` : text);
}
