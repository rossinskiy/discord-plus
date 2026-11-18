/*
 * Vencord, a Discord client mod
 * Copyright (c) 2026 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

const BARS = "▁▂▃▄▅▆▇█";

/**
 * One bar per number, scaled to the biggest value. A zero is always the lowest bar,
 * any other value is at least the second lowest. Empty when there is nothing to draw.
 */
export function sparkline(values: number[]) {
    const max = Math.max(...values);
    if (!(max > 0)) return "";
    return values.map(v => v <= 0 ? BARS[0] : BARS[Math.max(1, Math.round((v / max) * (BARS.length - 1)))]).join("");
}
