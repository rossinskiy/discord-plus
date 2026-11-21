/*
 * Vencord, a Discord client mod
 * Copyright (c) 2026 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { ApplicationCommandInputType, ApplicationCommandOptionType, findOption, sendBotMessage } from "@api/Commands";
import { Devs } from "@utils/constants";
import { t } from "@utils/i18n";
import definePlugin from "@utils/types";
import { GuildRoleStore, PermissionsBits, PermissionStore, RestAPI } from "@webpack/common";

import { copyRoleBody } from "./copyRole";

export default definePlugin({
    name: "RoleDuplication",
    authors: [Devs.Tsar],
    description: "Run /duplicaterole with a role's name to make a copy of it in the open server, with the same colour and permissions. You need the Manage Roles permission there.",
    tags: ["Servers", "Utility"],

    commands: [{
        name: "duplicaterole",
        description: t("Make a copy of a role in this server"),
        inputType: ApplicationCommandInputType.BUILT_IN,
        options: [
            { name: "role", description: t("Name of the role to copy"), type: ApplicationCommandOptionType.STRING, required: true }
        ],
        async execute(args, ctx) {
            const { guild } = ctx;
            if (!guild) return sendBotMessage(ctx.channel.id, { content: t("Open a server first, roles live in servers.") });
            if (!PermissionStore.can(PermissionsBits.MANAGE_ROLES, guild))
                return sendBotMessage(ctx.channel.id, { content: t("You need the Manage Roles permission in this server.") });

            const name: string = findOption(args, "role", "").trim().toLowerCase();
            const role = GuildRoleStore.getSortedRoles(guild.id).find(r => r.name.toLowerCase() === name && r.id !== guild.id);
            if (!role) return sendBotMessage(ctx.channel.id, { content: t("There is no role called \"{name}\" here. Type the full name.", { name }) });
            if (role.managed) return sendBotMessage(ctx.channel.id, { content: t("This role belongs to a bot or integration and cannot be copied.") });

            try {
                await RestAPI.post({ url: `/guilds/${guild.id}/roles`, body: copyRoleBody(role, t("(copy)")) });
                sendBotMessage(ctx.channel.id, { content: t("Created a copy of \"{name}\".", { name: role.name }) });
            } catch (err: any) {
                console.error("[RoleDuplication] create failed", err);
                sendBotMessage(ctx.channel.id, { content: t("Discord refused: {reason}", { reason: err?.body?.message ?? err?.status ?? "?" }) });
            }
        }
    }]
});
