/*
 * Vencord, a Discord client mod
 * Copyright (c) 2026 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { ApplicationCommandInputType, ApplicationCommandOptionType, findOption, sendBotMessage } from "@api/Commands";
import { Devs } from "@utils/constants";
import { t } from "@utils/i18n";
import definePlugin from "@utils/types";
import { GuildMemberStore, GuildStore, UserStore } from "@webpack/common";

import { commonIds, findByName } from "./common";

const SHOWN = 20;

export default definePlugin({
    name: "MutualServerMembers",
    authors: [Devs.Tsar],
    description: "Run /mutual with another server's name to see which people are in both that server and the one you have open. Discord only gives the client the members it has already loaded, so big servers show part of the picture.",
    tags: ["Servers", "Utility"],

    commands: [{
        name: "mutual",
        description: t("List people who are in this server and in another server of yours"),
        inputType: ApplicationCommandInputType.BUILT_IN,
        options: [
            { name: "server", description: t("Name of the other server (a part of it is enough)"), type: ApplicationCommandOptionType.STRING, required: true }
        ],
        execute(args, ctx) {
            const here = ctx.guild;
            if (!here) return sendBotMessage(ctx.channel.id, { content: t("Open a server first, this command compares it with another one.") });

            const query: string = findOption(args, "server", "");
            const candidates = GuildStore.getGuildsArray().filter(g => g.id !== here.id);
            const { match, others } = findByName(candidates, query);
            if (!match) return sendBotMessage(ctx.channel.id, { content: t("You are not in another server called \"{name}\".", { name: query }) });

            const ids = commonIds(GuildMemberStore.getMemberIds(here.id), GuildMemberStore.getMemberIds(match.id))
                .filter(id => id !== UserStore.getCurrentUser()?.id);

            const head = t("{a} and {b}: {n} people in both.", { a: here.name, b: match.name, n: ids.length })
                + (others.length ? " " + t("Other servers matched too, so be more exact if this is the wrong one.") : "");
            const list = ids.slice(0, SHOWN).map(id => `<@${id}>`).join(" ");
            const more = ids.length > SHOWN ? " " + t("and {n} more", { n: ids.length - SHOWN }) : "";
            sendBotMessage(ctx.channel.id, { content: head + (ids.length ? "\n" + list + more : "") + "\n" + t("Only members Discord has loaded are counted.") });
        }
    }]
});
