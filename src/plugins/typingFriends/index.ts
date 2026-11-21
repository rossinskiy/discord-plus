/*
 * Vencord, a Discord client mod
 * Copyright (c) 2026 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { ApplicationCommandInputType, sendBotMessage } from "@api/Commands";
import { Devs } from "@utils/constants";
import { t } from "@utils/i18n";
import definePlugin from "@utils/types";
import { RelationshipStore, UserStore } from "@webpack/common";

import { prune, typingNow,TypingRecord } from "./typing";

const records = new Map<string, TypingRecord>();

export default definePlugin({
    name: "TypingFriends",
    authors: [Devs.Tsar],
    description: "Run /typing to see which of your friends are typing right now, in any server or chat you can see, with a link to where. Discord only tells the client about typing in channels it has loaded, so quiet corners can be missed.",
    tags: ["Friends", "Chat"],

    flux: {
        TYPING_START({ channelId, userId }: { channelId: string; userId: string; }) {
            if (!userId || userId === UserStore.getCurrentUser()?.id) return;
            const now = Date.now();
            records.set(userId, { channelId, at: now });
            prune(records, now);
        }
    },

    stop() {
        records.clear();
    },

    commands: [{
        name: "typing",
        description: t("Show which of your friends are typing right now"),
        inputType: ApplicationCommandInputType.BUILT_IN,
        execute(_, ctx) {
            const friends = new Set(RelationshipStore.getFriendIDs());
            const typing = typingNow(records, Date.now(), friends);
            if (!typing.length) return sendBotMessage(ctx.channel.id, { content: t("None of your friends are typing right now.") });
            sendBotMessage(ctx.channel.id, { content: typing.map(x => `<@${x.userId}> in <#${x.channelId}>`).join("\n") });
        }
    }]
});
