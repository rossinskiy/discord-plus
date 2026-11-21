/*
 * Vencord, a Discord client mod
 * Copyright (c) 2026 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

const escapeRegex = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

/**
 * Removes the given words from the text, whole words only and ignoring case, so "ass" does not
 * damage "class". Spaces left behind are tidied up on the line where something was removed.
 */
export function removeWords(text: string, words: string[]): string {
    const list = words.map(w => w.trim()).filter(Boolean);
    if (!list.length) return text;
    const re = new RegExp(`(?<![\\p{L}\\p{N}_])(?:${list.map(escapeRegex).join("|")})(?![\\p{L}\\p{N}_])`, "giu");

    return text.split("\n").map(line => {
        const cleaned = line.replace(re, "");
        return cleaned === line ? line : cleaned.replace(/ {2,}/g, " ").replace(/^ +| +$/g, "");
    }).join("\n");
}
