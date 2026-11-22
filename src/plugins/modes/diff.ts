/*
 * Vencord, a Discord client mod
 * Copyright (c) 2026 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

export interface ModeChange { enable: string[]; disable: string[]; }

/**
 * What has to change to go from the plugins that are on now to the ones a mode wants on.
 * Only plugins in `switchable` are touched, the rest stay as they are.
 */
export function diffModes(current: Iterable<string>, wanted: Iterable<string>, switchable: Set<string>): ModeChange {
    const now = new Set(current);
    const target = new Set(wanted);
    const enable = [...target].filter(n => switchable.has(n) && !now.has(n)).sort();
    const disable = [...now].filter(n => switchable.has(n) && !target.has(n)).sort();
    return { enable, disable };
}

/** Mode names are short and plain, so they are easy to type in a command. */
export function cleanModeName(input: string): string | null {
    const name = input.trim().replace(/\s+/g, " ");
    return /^[\p{L}\p{N} _-]{1,30}$/u.test(name) ? name : null;
}
