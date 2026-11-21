/*
 * Vencord, a Discord client mod
 * Copyright (c) 2026 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

/** A file name that is safe to save: no folders, no characters Windows refuses, never empty. */
export function safeFilename(name: string, fallback = "file"): string {
    const cleaned = name
        .replace(/[\\/:*?"<>|\x00-\x1f]/g, "_")
        .replace(/^\.+/, "")
        .trim()
        .slice(0, 150);
    return cleaned || fallback;
}
