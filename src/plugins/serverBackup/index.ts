/*
 * Vencord, a Discord client mod
 * Copyright (c) 2026 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { ApplicationCommandInputType, sendBotMessage } from "@api/Commands";
import { Devs } from "@utils/constants";
import { t } from "@utils/i18n";
import definePlugin from "@utils/types";
import { ChannelStore, EmojiStore, GuildRoleStore } from "@webpack/common";

import { backupFileName, buildBackup, ChannelIn, RoleIn } from "./backup";

function save(name: string, json: string) {
    const url = URL.createObjectURL(new Blob([json], { type: "application/json" }));
    const a = document.createElement("a");
    a.href = url;
    a.download = name;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 10_000);
}

export default definePlugin({
    name: "ServerBackup",
    authors: [Devs.Tsar],
    description: "Run /serverbackup in a server to save its roles, channels, permission overrides and emoji list to a JSON file on your computer. It reads only what your account can already see and needs no permissions. It saves the structure, it does not restore it, use ServerCloner to build a copy.",
    tags: ["Servers", "Utility"],

    commands: [{
        name: "serverbackup",
        description: t("Save this server's roles and channels to a file"),
        inputType: ApplicationCommandInputType.BUILT_IN,
        execute(_, ctx) {
            const { guild } = ctx;
            if (!guild) return sendBotMessage(ctx.channel.id, { content: t("Open a server first.") });

            const roles = Object.values(GuildRoleStore.getRolesSnapshot(guild.id)) as unknown as RoleIn[];
            const channels = Object.values(ChannelStore.getMutableGuildChannelsForGuild(guild.id)) as unknown as ChannelIn[];
            const emojis = (EmojiStore.getGuilds()[guild.id]?.emojis ?? []).map(e => ({
                name: e.name,
                animated: !!e.animated,
                url: `https://cdn.discordapp.com/emojis/${e.id}.${e.animated ? "gif" : "png"}`
            }));

            const backup = buildBackup({ id: guild.id, name: guild.name }, roles, channels, emojis);
            save(backupFileName(guild.name), JSON.stringify(backup, null, 2));
            sendBotMessage(ctx.channel.id, { content: t("Saved a backup of {name}: {roles} roles, {channels} channels, {emojis} emojis. Check your downloads.", { name: guild.name, roles: backup.roles.length, channels: backup.channels.length, emojis: backup.emojis.length }) });
        }
    }]
});
