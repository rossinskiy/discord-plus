/*
 * Vencord, a Discord client mod
 * Copyright (c) 2026 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

export interface RoleIn {
    id: string; name: string; color: number; hoist: boolean; mentionable: boolean;
    permissions: bigint; position: number; managed: boolean;
}

export interface ChannelIn {
    id: string; name: string; type: number; position: number; parent_id: string | null | undefined;
    topic?: string; nsfw?: boolean; rateLimitPerUser?: number; bitrate?: number; userLimit?: number;
    permissionOverwrites?: Record<string, { id: string; type: number; allow: bigint; deny: bigint; }>;
}

export interface Backup {
    format: "discord-plus-server-backup";
    version: 1;
    savedAt: string;
    server: { id: string; name: string; };
    roles: { id: string; name: string; color: number; hoist: boolean; mentionable: boolean; permissions: string; position: number; }[];
    channels: {
        id: string; name: string; type: number; position: number; parentId: string | null;
        topic: string | null; nsfw: boolean; slowmode: number; bitrate: number | null; userLimit: number | null;
        overwrites: { id: string; type: number; allow: string; deny: string; }[];
    }[];
    emojis: { name: string; animated: boolean; url: string; }[];
}

/** The server structure in a plain form that can be saved as JSON. Permissions become strings, because JSON has no bigint. */
export function buildBackup(
    server: { id: string; name: string; },
    roles: RoleIn[],
    channels: ChannelIn[],
    emojis: { name: string; animated: boolean; url: string; }[],
    now = new Date()
): Backup {
    return {
        format: "discord-plus-server-backup",
        version: 1,
        savedAt: now.toISOString(),
        server: { id: server.id, name: server.name },
        roles: roles
            .filter(r => !r.managed && r.id !== server.id)
            .sort((a, b) => a.position - b.position)
            .map(r => ({ id: r.id, name: r.name, color: r.color, hoist: r.hoist, mentionable: r.mentionable, permissions: r.permissions.toString(), position: r.position })),
        channels: [...channels]
            .sort((a, b) => a.position - b.position)
            .map(c => ({
                id: c.id, name: c.name, type: c.type, position: c.position,
                parentId: c.parent_id ?? null,
                topic: c.topic ?? null,
                nsfw: !!c.nsfw,
                slowmode: c.rateLimitPerUser ?? 0,
                bitrate: c.bitrate ?? null,
                userLimit: c.userLimit ?? null,
                overwrites: Object.values(c.permissionOverwrites ?? {}).map(o => ({ id: o.id, type: o.type, allow: o.allow.toString(), deny: o.deny.toString() }))
            })),
        emojis
    };
}

/** A file name for the backup, safe on Windows: the server name with odd characters replaced, plus the date. */
export function backupFileName(serverName: string, now = new Date()): string {
    const clean = serverName.replace(/[\\/:*?"<>|\x00-\x1f]/g, "_").trim().slice(0, 60) || "server";
    return `${clean} backup ${now.toISOString().slice(0, 10)}.json`;
}
