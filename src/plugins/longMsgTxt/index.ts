/*
 * Vencord, a Discord client mod
 * Copyright (c) 2026 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { Devs } from "@utils/constants";
import { sendMessage } from "@utils/discord";
import { t } from "@utils/i18n";
import definePlugin from "@utils/types";
import { showToast, Toasts, UserStore } from "@webpack/common";

import { splitMessage } from "./split";

const NITRO = 2;
// Longer than this is more than a few messages, which looks like spam. Ask first by not sending.
const MAX_PIECES = 5;

export default definePlugin({
    name: "LongMsgTxt",
    authors: [Devs.Tsar],
    description: "When a message is longer than Discord allows (2000 characters, 4000 with Nitro), sends it as several messages in a row instead of refusing. Cuts at line breaks, and keeps code blocks intact. At most 5 messages.",
    tags: ["Chat", "Utility"],

    async onBeforeMessageSend(channelId, msg, options, props) {
        if (props?.hasAttachments || props?.hasStickers) return;
        const limit = UserStore.getCurrentUser()?.premiumType === NITRO ? 4000 : 2000;
        if (msg.content.length <= limit) return;

        const pieces = splitMessage(msg.content, limit);
        if (pieces.length > MAX_PIECES) {
            showToast(t("Too long even for {n} messages. Shorten it.", { n: MAX_PIECES }), Toasts.Type.FAILURE);
            return { cancel: true };
        }

        // The reply link and mention settings belong to the first piece only.
        for (const [i, piece] of pieces.entries()) {
            await sendMessage(channelId, { ...msg, content: piece }, true, i === 0 ? (options as any) : {});
        }
        return { cancel: true };
    }
});
