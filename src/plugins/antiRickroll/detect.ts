/*
 * Vencord, a Discord client mod
 * Copyright (c) 2026 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

// The YouTube video id of the famous song, as it appears in watch, short and embed links.
const RICKROLL_ID = "dQw4w9WgXcQ";
const LINK_RE = /https?:\/\/[^\s<>]+/gi;

/** True when the text holds a link to the well known rickroll video. */
export function hasRickroll(text: string): boolean {
    const links = text.match(LINK_RE);
    if (!links) return false;
    return links.some(link => {
        try {
            const url = new URL(link);
            const host = url.hostname.replace(/^www\./, "").replace(/^m\./, "");
            if (host === "youtu.be") return url.pathname.slice(1).startsWith(RICKROLL_ID);
            if (host === "youtube.com" || host === "youtube-nocookie.com")
                return url.searchParams.get("v") === RICKROLL_ID || url.pathname.split("/").includes(RICKROLL_ID);
            return false;
        } catch {
            return false;
        }
    });
}
