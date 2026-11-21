/*
 * Vencord, a Discord client mod
 * Copyright (c) 2026 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

export interface Visit { channelId: string; guildId: string | null; }

/** Puts a channel at the front of the recent list, without duplicates, and keeps at most `max` entries. */
export function visit(list: Visit[], entry: Visit, max = 20): Visit[] {
    return [entry, ...list.filter(v => v.channelId !== entry.channelId)].slice(0, max);
}

/** The channel `steps` places back in the list, wrapping around. Null when there is nothing to go back to. */
export function stepBack(list: Visit[], steps: number): Visit | null {
    if (list.length < 2) return null;
    return list[steps % list.length] ?? null;
}
