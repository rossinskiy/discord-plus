/*
 * Vencord, a Discord client mod
 * Copyright (c) 2026 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

export interface Bookmark {
    messageId: string;
    channelId: string;
    guildId: string | null;
    author: string;
    text: string;
    savedAt: number;
}

export const MAX_BOOKMARKS = 200;

export function messageLink(b: Pick<Bookmark, "guildId" | "channelId" | "messageId">): string {
    return `https://discord.com/channels/${b.guildId ?? "@me"}/${b.channelId}/${b.messageId}`;
}

export function excerpt(text: string, max = 80): string {
    const one = text.replace(/\s+/g, " ").trim();
    return one.length > max ? one.slice(0, max - 3) + "..." : one;
}

export function has(list: Bookmark[], messageId: string): boolean {
    return list.some(b => b.messageId === messageId);
}

/** Adds a bookmark at the front. The oldest ones drop off past the limit. A message is never saved twice. */
export function add(list: Bookmark[], entry: Bookmark): Bookmark[] {
    if (has(list, entry.messageId)) return list;
    return [entry, ...list].slice(0, MAX_BOOKMARKS);
}

export function remove(list: Bookmark[], messageId: string): Bookmark[] {
    return list.filter(b => b.messageId !== messageId);
}
