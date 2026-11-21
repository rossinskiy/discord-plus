/*
 * Vencord, a Discord client mod
 * Copyright (c) 2026 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { ApplicationCommandInputType, ApplicationCommandOptionType, findOption, sendBotMessage } from "@api/Commands";
import { Devs } from "@utils/constants";
import { t } from "@utils/i18n";
import definePlugin from "@utils/types";

import { listVoiceChannels } from "./channels";
import { rankVoice } from "./rank";

const SHOWN = 15;

export default definePlugin({
    name: "VoiceChannelSearch",
    authors: [Devs.Tsar],
    description: "Run /vcfind to see voice channels across all your servers, the ones with people in them first. Add a name to search by channel or server name. Click a channel in the result to jump to it.",
    tags: ["Voice", "Servers"],

    commands: [{
        name: "vcfind",
        description: t("Find voice channels across all your servers"),
        inputType: ApplicationCommandInputType.BUILT_IN,
        options: [
            { name: "name", description: t("Part of a channel or server name (leave empty to list busy channels)"), type: ApplicationCommandOptionType.STRING, required: false }
        ],
        execute(args, ctx) {
            const query: string = findOption(args, "name", "");
            let found = rankVoice(listVoiceChannels(), query);
            if (!query.trim()) found = found.filter(v => v.count > 0);
            if (!found.length) return sendBotMessage(ctx.channel.id, { content: query.trim() ? t("No voice channel matches \"{name}\".", { name: query }) : t("Nobody is in a voice channel right now.") });

            const lines = found.slice(0, SHOWN).map(v => `<#${v.id}> (${v.guildName}): ${v.limit ? `${v.count}/${v.limit}` : v.count}`);
            const more = found.length > SHOWN ? "\n" + t("and {n} more", { n: found.length - SHOWN }) : "";
            sendBotMessage(ctx.channel.id, { content: lines.join("\n") + more });
        }
    }]
});
