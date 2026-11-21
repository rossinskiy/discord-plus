/*
 * Vencord, a Discord client mod
 * Copyright (c) 2026 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { ApplicationCommandInputType, ApplicationCommandOptionType, findOption, sendBotMessage } from "@api/Commands";
import * as DataStore from "@api/DataStore";
import { staleEntries, trackedDays } from "@plugins/serverPruner/stale";
import { Devs } from "@utils/constants";
import { t } from "@utils/i18n";
import definePlugin from "@utils/types";
import { ChannelStore, RelationshipStore, UserStore } from "@webpack/common";

const STORE_KEY = "RelationshipPruner_data";
const SHOWN = 25;

interface Data { since: number; talked: Record<string, number>; }

let data: Data = { since: Date.now(), talked: {} };

const save = () => DataStore.set(STORE_KEY, data);

export default definePlugin({
    name: "RelationshipPruner",
    authors: [Devs.Tsar],
    description: "Remembers when you last exchanged a direct message with each friend and lists friends you have not talked to for a long time, with /friendcheck. It only lists them, it never removes a friend for you. It starts counting when you turn it on, so it needs that many days of watching first.",
    tags: ["Friends", "Organisation"],

    flux: {
        MESSAGE_CREATE({ message }: { message: any; }) {
            if (message?.state) return;
            const channel = ChannelStore.getChannel(message?.channel_id);
            if (!channel?.isDM()) return;
            data.talked[channel.recipients[0]] = Date.now();
            save();
        }
    },

    async start() {
        data = await DataStore.get<Data>(STORE_KEY) ?? { since: Date.now(), talked: {} };
        save();
    },

    commands: [{
        name: "friendcheck",
        description: t("List friends you have not messaged for a while"),
        inputType: ApplicationCommandInputType.BUILT_IN,
        options: [
            { name: "days", description: t("How many days without a message (default 90)"), type: ApplicationCommandOptionType.INTEGER, required: false }
        ],
        execute(args, ctx) {
            const days = Math.max(7, Number(findOption(args, "days", 90)) || 90);
            const stale = staleEntries(RelationshipStore.getFriendIDs(), data.talked, data.since, days);
            if (!stale) {
                return sendBotMessage(ctx.channel.id, { content: t("I have only been watching for {have} days, and need {need}. Ask again later.", { have: trackedDays(data.since), need: days }) });
            }
            if (!stale.length) return sendBotMessage(ctx.channel.id, { content: t("You talked to every friend in the last {n} days.", { n: days }) });

            const lines = stale.slice(0, SHOWN).map(e => `${UserStore.getUser(e.id)?.username ?? e.id}: ${t("{n} days", { n: e.days })}`);
            const more = stale.length > SHOWN ? "\n" + t("and {n} more", { n: stale.length - SHOWN }) : "";
            sendBotMessage(ctx.channel.id, { content: t("Friends with no messages for {n} days or more:", { n: days }) + "\n" + lines.join("\n") + more });
        }
    }]
});
