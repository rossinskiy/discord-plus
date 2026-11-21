/*
 * Vencord, a Discord client mod
 * Copyright (c) 2026 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

/** Where to cut `text` so the piece is at most `limit` long: at a line break, else a space, else anywhere. */
function cutPoint(text: string, limit: number): number {
    const window = text.slice(0, limit);
    const nl = window.lastIndexOf("\n");
    if (nl > limit * 0.5) return nl + 1;
    const sp = window.lastIndexOf(" ");
    if (sp > limit * 0.5) return sp + 1;
    return limit;
}

/** The opening fence line (``` plus language) of a code block that is still open at the end of `piece`, or null. */
function openFence(piece: string): string | null {
    let open: string | null = null;
    for (const line of piece.split("\n")) {
        const m = /^\s*(```[^\s`]*)/.exec(line);
        if (m) open = open === null ? m[1] : null;
    }
    return open;
}

/**
 * Splits a long message into pieces of at most `limit` characters. Cuts fall at line breaks or spaces
 * when possible. A code block that a cut lands inside is closed at the end of one piece and opened
 * again at the start of the next, so the formatting survives.
 */
export function splitMessage(text: string, limit: number): string[] {
    if (limit < 20) throw new Error("limit too small");
    const pieces: string[] = [];
    let rest = text;
    let reopen = "";

    while (rest.length) {
        const prefix = reopen ? reopen + "\n" : "";
        // Leave room for the closing fence that may need to be added.
        const room = limit - prefix.length - 4;
        if (prefix.length + rest.length <= limit && !openFence(prefix + rest)) {
            pieces.push(prefix + rest);
            break;
        }
        const budget = prefix.length + rest.length <= limit ? rest.length : room;
        const at = budget === rest.length ? rest.length : cutPoint(rest, budget);
        const chunk = rest.slice(0, at);
        rest = rest.slice(at);

        const fence = openFence(prefix + chunk);
        if (fence && rest.length) {
            pieces.push(prefix + chunk.replace(/\n?$/, "\n") + "```");
            reopen = fence;
        } else {
            pieces.push(prefix + chunk);
            reopen = "";
        }
    }
    return pieces.filter(p => p.trim().length);
}
