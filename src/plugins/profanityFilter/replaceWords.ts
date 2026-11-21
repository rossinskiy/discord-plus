/*
 * Vencord, a Discord client mod
 * Copyright (c) 2026 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

export interface Rule { word: string; replacement: string; }

const escapeRegex = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

/**
 * Reads rules written one per line as "word=replacement". A line with only a word, or with an
 * empty replacement, means the word is removed. Lines without a word are skipped.
 */
export function parseRules(text: string): Rule[] {
    const rules: Rule[] = [];
    for (const line of text.split("\n")) {
        const eq = line.indexOf("=");
        const word = (eq === -1 ? line : line.slice(0, eq)).trim();
        if (!word) continue;
        rules.push({ word, replacement: eq === -1 ? "" : line.slice(eq + 1).trim() });
    }
    return rules;
}

/** Gives the replacement the same capitals as the word it replaces: FUCK, Fuck or fuck. */
function matchCase(original: string, replacement: string): string {
    if (!replacement) return replacement;
    const hasLetters = original.toLowerCase() !== original.toUpperCase();
    if (hasLetters && original.length > 1 && original === original.toUpperCase()) return replacement.toUpperCase();
    const [first] = original;
    if (first !== first.toLowerCase()) return replacement[0].toUpperCase() + replacement.slice(1);
    return replacement;
}

/**
 * Swaps listed words for their replacements, whole words only and ignoring case, so "ass" does not
 * damage "class". The replacement keeps the capitals of the original. A word with no replacement
 * is removed and the extra space it leaves is tidied up on that line.
 */
export function replaceWords(text: string, rules: Rule[]): string {
    if (!rules.length) return text;
    const byWord = new Map(rules.map(r => [r.word.toLowerCase(), r.replacement]));
    const alternatives = [...byWord.keys()].sort((a, b) => b.length - a.length).map(escapeRegex).join("|");
    const re = new RegExp(`(?<![\\p{L}\\p{N}_])(?:${alternatives})(?![\\p{L}\\p{N}_])`, "giu");

    return text.split("\n").map(line => {
        let removed = false;
        const out = line.replace(re, match => {
            const replacement = byWord.get(match.toLowerCase()) ?? "";
            if (!replacement) removed = true;
            return matchCase(match, replacement);
        });
        return removed ? out.replace(/ {2,}/g, " ").replace(/^ +| +$/g, "") : out;
    }).join("\n");
}
