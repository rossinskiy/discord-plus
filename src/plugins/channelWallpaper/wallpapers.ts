/*
 * Vencord, a Discord client mod
 * Copyright (c) 2026 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

/** Channel id to the web address of its wallpaper. */
export type Wallpapers = Record<string, string>;

/** Only web pictures are allowed, so a wallpaper can not point at a local file or run script. */
export function cleanUrl(input: string): string | null {
    try {
        const url = new URL(input.trim());
        return url.protocol === "https:" ? url.toString() : null;
    } catch {
        return null;
    }
}

/** A CSS value that is safe to put in `url(...)`: quotes and backslashes are escaped. */
export function cssUrl(url: string): string {
    return `url("${url.replace(/["\\\n\r]/g, c => encodeURIComponent(c))}")`;
}

export function setWallpaper(list: Wallpapers, channelId: string, url: string | null): Wallpapers {
    const next = { ...list };
    if (url) next[channelId] = url;
    else delete next[channelId];
    return next;
}
