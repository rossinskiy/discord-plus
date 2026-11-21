/*
 * Vencord, a Discord client mod
 * Copyright (c) 2026 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

/** Seconds spent in Discord per local calendar day, keyed "YYYY-MM-DD". */
export type Usage = Record<string, number>;

const DAY_MS = 86_400_000;

export function dayKey(time = Date.now()): string {
    const d = new Date(time);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

/** Seconds for each of the last `n` days, oldest first, ending today. Days with no record are 0. */
export function lastDays(usage: Usage, n: number, now = Date.now()): number[] {
    return Array.from({ length: n }, (_, i) => usage[dayKey(now - (n - 1 - i) * DAY_MS)] ?? 0);
}

/** "2 h 05 min", "35 min" or "0 min". */
export function formatDuration(seconds: number, hourUnit = "h", minuteUnit = "min"): string {
    const totalMin = Math.round(seconds / 60);
    const h = Math.floor(totalMin / 60);
    const m = totalMin % 60;
    return h ? `${h} ${hourUnit} ${String(m).padStart(2, "0")} ${minuteUnit}` : `${m} ${minuteUnit}`;
}

/** Keeps only the newest `keep` days, so the saved data does not grow forever. */
export function prune(usage: Usage, keep = 120): Usage {
    const keys = Object.keys(usage).sort().slice(-keep);
    return Object.fromEntries(keys.map(k => [k, usage[k]]));
}
