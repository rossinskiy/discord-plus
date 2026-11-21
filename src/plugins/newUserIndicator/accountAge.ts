/*
 * Vencord, a Discord client mod
 * Copyright (c) 2026 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

const DISCORD_EPOCH = 1420070400000n;
const DAY_MS = 86_400_000;

/** When the account (or any object) with this snowflake id was created, in ms since 1970. Null for a bad id. */
export function createdAt(id: string): number | null {
    if (!/^\d{15,22}$/.test(id)) return null;
    return Number((BigInt(id) >> 22n) + DISCORD_EPOCH);
}

/** Whole days between the account's creation and `now`, or null for a bad id. */
export function accountAgeDays(id: string, now = Date.now()): number | null {
    const created = createdAt(id);
    return created == null ? null : Math.max(0, Math.floor((now - created) / DAY_MS));
}
