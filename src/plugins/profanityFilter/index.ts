/*
 * Vencord, a Discord client mod
 * Copyright (c) 2026 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { definePluginSettings } from "@api/Settings";
import { Devs } from "@utils/constants";
import { t } from "@utils/i18n";
import definePlugin, { OptionType } from "@utils/types";
import { showToast, Toasts } from "@webpack/common";

import { removeWords } from "./removeWords";

const settings = definePluginSettings({
    words: {
        type: OptionType.STRING,
        description: t("Words to remove from your messages before they are sent. One per line, whole words only."),
        default: "",
        multiline: true
    }
});

function words() {
    return settings.store.words.split("\n");
}

export default definePlugin({
    name: "ProfanityFilter",
    authors: [Devs.Tsar],
    description: "Takes words you choose out of your own messages before they are sent, such as swear words you are trying to stop using. Whole words only. If nothing is left, the message is not sent.",
    tags: ["Chat", "Utility"],
    settings,

    onBeforeMessageSend(_, msg) {
        const before = msg.content;
        msg.content = removeWords(msg.content, words());
        if (before.trim() && !msg.content.trim()) {
            showToast(t("Message not sent: only filtered words were left."), Toasts.Type.FAILURE);
            return { cancel: true };
        }
    },

    onBeforeMessageEdit(_cid, _mid, msg) {
        msg.content = removeWords(msg.content, words());
    }
});
