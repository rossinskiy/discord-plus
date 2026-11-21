/*
 * Vencord, a Discord client mod
 * Copyright (c) 2026 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

export interface RoleLike {
    name: string;
    color: number;
    hoist: boolean;
    mentionable: boolean;
    permissions: bigint;
}

/** The request body for creating a copy of a role. Discord wants the permissions bitfield as a string. */
export function copyRoleBody(role: RoleLike, suffix: string) {
    return {
        name: `${role.name} ${suffix}`.slice(0, 100),
        color: role.color,
        hoist: role.hoist,
        mentionable: role.mentionable,
        permissions: role.permissions.toString()
    };
}
