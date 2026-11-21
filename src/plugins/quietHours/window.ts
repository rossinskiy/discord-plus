/*
 * Vencord, a Discord client mod
 * Copyright (c) 2026 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

/** Parses "22:00" or "7:30" into minutes since midnight. Null when it is not a valid 24 hour time. */
export function parseHM(input: string): number | null {
    const m = /^(\d{1,2}):(\d{2})$/.exec(input.trim());
    if (!m) return null;
    const h = Number(m[1]), min = Number(m[2]);
    return h > 23 || min > 59 ? null : h * 60 + min;
}

/** True when `minute` (minutes since midnight) falls in [start, end). The window may cross midnight. */
export function inWindow(minute: number, start: number, end: number): boolean {
    if (start === end) return false;
    return start < end ? minute >= start && minute < end : minute >= start || minute < end;
}
