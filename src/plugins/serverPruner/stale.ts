/*
 * Vencord, a Discord client mod
 * Copyright (c) 2026 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

const DAY_MS = 86_400_000;

export interface Staleness { id: string; days: number; }

/** Whole days the plugin has been watching, counted from `since`. */
export function trackedDays(since: number, now = Date.now()): number {
    return Math.max(0, Math.floor((now - since) / DAY_MS));
}

/**
 * Ids with no activity for at least `days` days, longest quiet first. An id with no record counts
 * as quiet since the plugin started watching. Returns null while the plugin has watched for less
 * than `days` days, because it cannot know yet.
 */
export function staleEntries(ids: string[], lastActive: Record<string, number>, since: number, days: number, now = Date.now()): Staleness[] | null {
    if (trackedDays(since, now) < days) return null;
    return ids
        .map(id => ({ id, days: Math.floor((now - (lastActive[id] ?? since)) / DAY_MS) }))
        .filter(e => e.days >= days)
        .sort((a, b) => b.days - a.days || a.id.localeCompare(b.id));
}
