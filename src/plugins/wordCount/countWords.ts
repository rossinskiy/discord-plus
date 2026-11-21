/*
 * Vencord, a Discord client mod
 * Copyright (c) 2026 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

/** Counts words in message text. Code blocks, custom emoji and mentions are not words. */
export function countWords(text: string): number {
    const cleaned = text
        .replace(/```[\s\S]*?```/g, " ")
        .replace(/<a?:\w+:\d+>|<[@#][&!]?\d+>|<t:\d+(?::\w)?>/g, " ")
        .replace(/https?:\/\/\S+/g, " ");
    return cleaned.split(/\s+/).filter(w => /[\p{L}\p{N}]/u.test(w)).length;
}
