/*
 * Vencord, a Discord client mod
 * Copyright (c) 2026 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

// Small high-score style records for the toys. Plain localStorage is enough, and
// everything still works if it is unavailable. The game also mirrors these into
// its save file on disk, so they survive a profile wipe.
export const STAT_KEYS = ["knife", "circle", "parkour"];

let onWrite: (() => void) | undefined;
export function setStatListener(fn: (() => void) | undefined) {
    onWrite = fn;
}

export function readStat<T extends object>(key: string, fallback: T): T {
    try {
        const raw = localStorage.getItem(`IdleLounge_${key}`);
        return raw ? { ...fallback, ...JSON.parse(raw) } : fallback;
    } catch {
        return fallback;
    }
}

export function writeStat(key: string, value: object) {
    try {
        localStorage.setItem(`IdleLounge_${key}`, JSON.stringify(value));
    } catch { }
    onWrite?.();
}

export function allStats() {
    const out: Record<string, object> = {};
    for (const key of STAT_KEYS) {
        try {
            const raw = localStorage.getItem(`IdleLounge_${key}`);
            if (raw) out[key] = JSON.parse(raw);
        } catch { }
    }
    return out;
}

// Only fills in records this browser is missing, so a fresher local one is never overwritten.
export function restoreStats(saved: Record<string, any>) {
    for (const key of STAT_KEYS) {
        try {
            if (saved[key] && localStorage.getItem(`IdleLounge_${key}`) === null) {
                localStorage.setItem(`IdleLounge_${key}`, JSON.stringify(saved[key]));
            }
        } catch { }
    }
}
