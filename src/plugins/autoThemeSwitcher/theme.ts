/*
 * Vencord, a Discord client mod
 * Copyright (c) 2026 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { inWindow, parseHM } from "@plugins/quietHours/window";

export type Theme = "light" | "dark";

/** Light between `dayStart` and `nightStart`, dark the rest of the day. Null when a time is not valid. */
export function desiredTheme(minute: number, dayStart: string, nightStart: string): Theme | null {
    const day = parseHM(dayStart);
    const night = parseHM(nightStart);
    if (day == null || night == null || day === night) return null;
    return inWindow(minute, day, night) ? "light" : "dark";
}
