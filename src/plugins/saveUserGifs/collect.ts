/*
 * Vencord, a Discord client mod
 * Copyright (c) 2026 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

/** Values of Discord's favorite GIF format field. */
export const GIF_FORMAT_IMAGE = 1;
export const GIF_FORMAT_VIDEO = 2;

export interface FavoriteGif {
    url: string;
    src: string;
    width: number;
    height: number;
    format: number;
}

interface MessageLike {
    author?: { id?: string; };
    attachments?: { url: string; content_type?: string; width?: number; height?: number; }[];
    embeds?: { type?: string; url?: string; video?: { url?: string; proxyURL?: string; width?: number; height?: number; }; }[];
}

/**
 * Collects the GIFs one person sent: GIF files they uploaded and GIF links that Discord turned
 * into players (Tenor, Giphy). Each GIF appears once, newest message last in the input stays last.
 */
export function collectGifs(messages: MessageLike[], authorId: string, max = 50): FavoriteGif[] {
    const found = new Map<string, FavoriteGif>();
    for (const m of messages) {
        if (m.author?.id !== authorId) continue;

        for (const a of m.attachments ?? []) {
            if (a.content_type !== "image/gif" || found.has(a.url)) continue;
            found.set(a.url, { url: a.url, src: a.url, width: a.width ?? 0, height: a.height ?? 0, format: GIF_FORMAT_IMAGE });
        }
        for (const e of m.embeds ?? []) {
            const src = e.video?.proxyURL ?? e.video?.url;
            if (e.type !== "gifv" || !e.url || !src || found.has(e.url)) continue;
            found.set(e.url, { url: e.url, src, width: e.video?.width ?? 0, height: e.video?.height ?? 0, format: GIF_FORMAT_VIDEO });
        }
    }
    return [...found.values()].slice(-max);
}
