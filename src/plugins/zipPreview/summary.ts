/*
 * Vencord, a Discord client mod
 * Copyright (c) 2026 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

export interface ZipEntry { name: string; size: number; }

export function formatSize(bytes: number): string {
    if (bytes < 1024) return `${bytes} B`;
    const units = ["KB", "MB", "GB", "TB"];
    let value = bytes;
    let i = -1;
    do { value /= 1024; i++; } while (value >= 1024 && i < units.length - 1);
    return `${value >= 100 ? Math.round(value) : Math.round(value * 10) / 10} ${units[i]}`;
}

/** Entry names that could write outside the folder when unpacked: absolute paths and "..". */
export function isRiskyPath(name: string): boolean {
    const parts = name.replace(/\\/g, "/").split("/");
    return name.startsWith("/") || /^[a-zA-Z]:/.test(name) || parts.includes("..");
}

/** Lines that describe the archive: a header, then up to `max` entries with their sizes. */
export function describeZip(entries: ZipEntry[], max = 40): { files: number; total: number; risky: number; lines: string[]; } {
    const files = entries.filter(e => !e.name.endsWith("/"));
    const total = files.reduce((sum, e) => sum + e.size, 0);
    const lines = files.slice(0, max).map(e => `${e.name} (${formatSize(e.size)})`);
    return { files: files.length, total, risky: files.filter(e => isRiskyPath(e.name)).length, lines };
}
