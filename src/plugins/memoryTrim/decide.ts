/*
 * Vencord, a Discord client mod
 * Copyright (c) 2026 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

export interface TrimState {
    /** Memory the page's JavaScript is using, in MB. Null when the browser does not tell. */
    heapMB: number | null;
    /** How long the page has been running since it was last loaded. */
    pageUptimeMs: number;
    /** How long the window has been out of focus, 0 while you are using it. */
    unfocusedMs: number;
    inVoice: boolean;
    /** Time since this plugin last reloaded the page, Infinity if it never did. */
    sinceLastReloadMs: number;
}

export interface TrimSettings {
    heapLimitMB: number;
    maxHours: number;
    idleMinutes: number;
}

const MINUTE = 60_000;
const HOUR = 60 * MINUTE;
/** Never reload more often than this, so a heavy page cannot cause a reload loop. */
export const MIN_BETWEEN_RELOADS_MS = 30 * MINUTE;

/** Why the page should be reloaded now, or null when it should be left alone. */
export function reloadReason(s: TrimState, cfg: TrimSettings): "memory" | "age" | null {
    if (s.inVoice) return null;
    if (s.unfocusedMs < Math.max(1, cfg.idleMinutes) * MINUTE) return null;
    if (s.sinceLastReloadMs < MIN_BETWEEN_RELOADS_MS) return null;

    if (cfg.heapLimitMB > 0 && s.heapMB != null && s.heapMB >= cfg.heapLimitMB) return "memory";
    if (cfg.maxHours > 0 && s.pageUptimeMs >= cfg.maxHours * HOUR) return "age";
    return null;
}
