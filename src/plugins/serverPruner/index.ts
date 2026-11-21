/*
 * Vencord, a Discord client mod
 * Copyright (c) 2026 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { ApplicationCommandInputType, ApplicationCommandOptionType, findOption, sendBotMessage } from "@api/Commands";
import * as DataStore from "@api/DataStore";
import { Devs } from "@utils/constants";
import { t } from "@utils/i18n";
import definePlugin from "@utils/types";
import { GuildStore, SelectedGuildStore } from "@webpack/common";

import { staleEntries, trackedDays } from "./stale";

const STORE_KEY = "ServerPruner_data";
const SHOWN = 25;

interface Data { since: number; visited: Record<string, number>; }

let data: Data = { since: Date.now(), visited: {} };

const save = () => DataStore.set(STORE_KEY, data);

function markVisited(guildId: string | null | undefined) {
    if (!guildId) return;
    data.visited[guildId] = Date.now();
    save();
}

export default definePlugin({
    name: "ServerPruner",
    authors: [Devs.Tsar],
    description: "Remembers when you last opened each server and lists the ones you have not opened for a long time, with /serverpruner. It only lists them, it never leaves a server for you. It starts counting when you turn it on, so it needs that many days of watching first.",
    tags: ["Servers", "Organisation"],

    flux: {
        CHANNEL_SELECT({ guildId }: { guildId: string | null; }) {
            markVisited(guildId);
        }
    },

    async start() {
        data = await DataStore.get<Data>(STORE_KEY) ?? { since: Date.now(), visited: {} };
        markVisited(SelectedGuildStore.getGuildId());
        save();
    },

    commands: [{
        name: "serverpruner",
        description: t("List servers you have not opened for a while"),
        inputType: ApplicationCommandInputType.BUILT_IN,
        options: [
            { name: "days", description: t("How many days without opening (default 60)"), type: ApplicationCommandOptionType.INTEGER, required: false }
        ],
        execute(args, ctx) {
            const days = Math.max(7, Number(findOption(args, "days", 60)) || 60);
            const guilds = GuildStore.getGuildsArray();
            const stale = staleEntries(guilds.map(g => g.id), data.visited, data.since, days);
            if (!stale) {
                return sendBotMessage(ctx.channel.id, { content: t("I have only been watching for {have} days, and need {need}. Ask again later.", { have: trackedDays(data.since), need: days }) });
            }
            if (!stale.length) return sendBotMessage(ctx.channel.id, { content: t("You opened every server in the last {n} days.", { n: days }) });

            const lines = stale.slice(0, SHOWN).map(e => `${GuildStore.getGuild(e.id)?.name ?? e.id}: ${t("{n} days", { n: e.days })}`);
            const more = stale.length > SHOWN ? "\n" + t("and {n} more", { n: stale.length - SHOWN }) : "";
            sendBotMessage(ctx.channel.id, { content: t("Servers not opened for {n} days or more:", { n: days }) + "\n" + lines.join("\n") + more + "\n" + t("To leave one, right-click it in the server list.") });
        }
    }]
});
