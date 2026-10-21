/*
 * Vencord, a Discord client mod
 * Copyright (c) 2026 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

const UNIT_MS: Record<string, number> = {
    s: 1000,
    sec: 1000,
    secs: 1000,
    second: 1000,
    seconds: 1000,
    m: 60_000,
    min: 60_000,
    mins: 60_000,
    minute: 60_000,
    minutes: 60_000,
    h: 3_600_000,
    hr: 3_600_000,
    hrs: 3_600_000,
    hour: 3_600_000,
    hours: 3_600_000,
    d: 86_400_000,
    day: 86_400_000,
    days: 86_400_000,
    w: 604_800_000,
    week: 604_800_000,
    weeks: 604_800_000
};

const TOKEN_RE = /(\d+(?:\.\d+)?)\s*([a-z]*)/gi;

/**
 * Parses things like "10m", "2h30m", "1d", "90" (bare number = minutes).
 * Returns milliseconds from now, or null if nothing could be parsed.
 */
export function parseDuration(input: string): number | null {
    const text = input.trim().toLowerCase();
    if (!text) return null;

    let totalMs = 0;
    let matched = false;

    for (const match of text.matchAll(TOKEN_RE)) {
        const [, amountStr, unitStr] = match;
        const amount = parseFloat(amountStr);
        if (Number.isNaN(amount)) continue;

        const unit = unitStr || "m";
        const unitMs = UNIT_MS[unit];
        if (!unitMs) continue;

        totalMs += amount * unitMs;
        matched = true;
    }

    if (!matched || totalMs <= 0) return null;
    return totalMs;
}
