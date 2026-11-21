/*
 * Vencord, a Discord client mod
 * Copyright (c) 2026 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

export interface TypingRecord { channelId: string; at: number; }

/** Discord shows someone as typing for about 10 seconds after their last keystroke. */
export const TYPING_TTL_MS = 10_000;

/** People who are still typing at `now`, newest first, limited to `only` when it is given. */
export function typingNow(records: Map<string, TypingRecord>, now: number, only?: Set<string>, ttl = TYPING_TTL_MS) {
    return [...records]
        .filter(([userId, r]) => now - r.at < ttl && (!only || only.has(userId)))
        .sort((a, b) => b[1].at - a[1].at)
        .map(([userId, r]) => ({ userId, channelId: r.channelId }));
}

/** Drops records that expired, so the map does not grow all day. */
export function prune(records: Map<string, TypingRecord>, now: number, ttl = TYPING_TTL_MS) {
    for (const [userId, r] of records) if (now - r.at >= ttl) records.delete(userId);
}
