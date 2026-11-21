/*
 * Vencord, a Discord client mod
 * Copyright (c) 2026 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

// Invisible characters with no job in normal text, by code point: zero width space, word joiner,
// byte order mark, Mongolian vowel separator. The zero width non-joiner (0x200C) is left alone
// because Persian, Hindi and other scripts need it to spell words correctly.
const ALWAYS_INVISIBLE = new Set([0x200B, 0x2060, 0xFEFF, 0x180E]);
const ZERO_WIDTH_JOINER = 0x200D;
const VARIATION_SELECTOR_16 = 0xFE0F;
const EMOJI_RE = /\p{Extended_Pictographic}/u;

function isEmojiPart(codePoint: number) {
    // Skin tone modifiers, the emoji presentation selector, or an emoji itself.
    return (codePoint >= 0x1F3FB && codePoint <= 0x1F3FF)
        || codePoint === VARIATION_SELECTOR_16
        || EMOJI_RE.test(String.fromCodePoint(codePoint));
}

/**
 * Drops invisible characters. The zero width joiner glues emoji together (family, heart on fire),
 * so it is kept when it directly follows part of an emoji and dropped anywhere else.
 */
export function sanitize(text: string): string {
    let out = "";
    let prev = -1;
    for (const ch of text) {
        const cp = ch.codePointAt(0)!;
        if (ALWAYS_INVISIBLE.has(cp)) continue;
        if (cp === ZERO_WIDTH_JOINER && !(prev !== -1 && isEmojiPart(prev))) continue;
        out += ch;
        prev = cp;
    }
    return out;
}
