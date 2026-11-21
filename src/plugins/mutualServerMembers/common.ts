/*
 * Vencord, a Discord client mod
 * Copyright (c) 2026 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

/** Ids present in both lists, in the order of the first list, without repeats. */
export function commonIds(a: string[], b: string[]): string[] {
    const inB = new Set(b);
    const seen = new Set<string>();
    const out: string[] = [];
    for (const id of a) {
        if (inB.has(id) && !seen.has(id)) {
            seen.add(id);
            out.push(id);
        }
    }
    return out;
}

/** Picks a server by name: an exact match wins, otherwise a name that contains the text. Ignores case. */
export function findByName<T extends { name: string; }>(items: T[], query: string): { match: T | null; others: T[]; } {
    const q = query.trim().toLowerCase();
    if (!q) return { match: null, others: [] };
    const exact = items.filter(i => i.name.toLowerCase() === q);
    if (exact.length) return { match: exact[0], others: exact.slice(1) };
    const partial = items.filter(i => i.name.toLowerCase().includes(q));
    return { match: partial[0] ?? null, others: partial.slice(1) };
}
