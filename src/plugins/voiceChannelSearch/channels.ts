/*
 * Vencord, a Discord client mod
 * Copyright (c) 2026 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { ChannelStore, GuildChannelStore, GuildStore, PermissionsBits, PermissionStore, VoiceStateStore } from "@webpack/common";

import { VoiceInfo } from "./rank";

/** Every voice channel in your servers that you are allowed to join, with how many people are in it. */
export function listVoiceChannels(): VoiceInfo[] {
    const out: VoiceInfo[] = [];
    for (const guild of GuildStore.getGuildsArray()) {
        for (const id of GuildChannelStore.getVocalChannelIds(guild.id)) {
            const channel = ChannelStore.getChannel(id);
            if (!channel || !PermissionStore.can(PermissionsBits.CONNECT, channel)) continue;
            out.push({
                id,
                name: channel.name,
                guildName: guild.name,
                count: Object.keys(VoiceStateStore.getVoiceStatesForChannel(id) ?? {}).length,
                limit: channel.userLimit ?? 0
            });
        }
    }
    return out;
}
