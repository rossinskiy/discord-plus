/*
 * Vencord, a Discord client mod
 * Copyright (c) 2026 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { ApplicationCommandInputType, ApplicationCommandOptionType, findOption, sendBotMessage } from "@api/Commands";
import { Devs } from "@utils/constants";
import { t } from "@utils/i18n";
import definePlugin from "@utils/types";
import { MessageStore, RestAPI, UserStore } from "@webpack/common";

import { emojiParam, tally } from "./tally";

const MAX_MESSAGES = 25;

export default definePlugin({
    name: "ReactionTracker",
    authors: [Devs.Tsar],
    description: "Run /reactions with an emoji to see who reacted with it the most to your recent messages in this channel.",
    tags: ["Chat", "Utility"],

    commands: [{
        name: "reactions",
        description: t("Who reacts with an emoji to your recent messages in this channel"),
        inputType: ApplicationCommandInputType.BUILT_IN,
        options: [
            { name: "emoji", description: t("The emoji to count"), type: ApplicationCommandOptionType.STRING, required: true }
        ],
        async execute(args, ctx) {
            const param = emojiParam(findOption(args, "emoji", ""));
            if (!param) return sendBotMessage(ctx.channel.id, { content: t("Give an emoji to count.") });

            const myId = UserStore.getCurrentUser()?.id;
            const messages: any[] = MessageStore.getMessages(ctx.channel.id)?._array ?? [];
            const mine = messages.filter(m => m.author?.id === myId && m.reactions?.length).slice(-MAX_MESSAGES);

            const lists: string[][] = [];
            for (const m of mine) {
                try {
                    const res = await RestAPI.get({ url: `/channels/${ctx.channel.id}/messages/${m.id}/reactions/${param}`, query: { limit: 100 } });
                    lists.push((res.body as any[]).map(u => u.id).filter(id => id !== myId));
                } catch {
                    // This message has no such reaction, which Discord reports as an error.
                }
            }

            const rows = tally(lists).slice(0, 10);
            if (!rows.length) return sendBotMessage(ctx.channel.id, { content: t("Nobody reacted with that emoji to your recent loaded messages here.") });
            const lines = rows.map((r, i) => `${i + 1}. <@${r.userId}>: ${r.count}`);
            sendBotMessage(ctx.channel.id, { content: t("Top reactors, from your last {n} loaded messages with reactions:", { n: mine.length }) + "\n" + lines.join("\n") });
        }
    }]
});
