/*
 * Vencord, a Discord client mod
 * Copyright (c) 2026 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

const CLOCK_RE = /^(\d{1,2})(?:[:.](\d{2}))?\s*(am|pm)?$/i;

/**
 * Turns a time of day such as "18:30", "9:05", "6pm" or "6:30 pm" into the next moment
 * that clock time happens in the local time zone, counting from `now`.
 * Returns null when the text is not a valid time of day.
 */
export function parseClock(input: string, now = new Date()): number | null {
    const m = CLOCK_RE.exec(input.trim());
    if (!m) return null;

    let hours = Number(m[1]);
    const minutes = m[2] ? Number(m[2]) : 0;
    const suffix = m[3]?.toLowerCase();

    if (suffix) {
        if (hours < 1 || hours > 12) return null;
        hours = hours % 12 + (suffix === "pm" ? 12 : 0);
    }
    if (hours > 23 || minutes > 59) return null;

    const at = new Date(now);
    at.setHours(hours, minutes, 0, 0);
    // A time that already passed today means tomorrow.
    if (at.getTime() <= now.getTime()) at.setDate(at.getDate() + 1);
    return at.getTime();
}
