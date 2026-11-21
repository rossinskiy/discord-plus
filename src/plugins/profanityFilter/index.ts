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

import { parseRules, replaceWords } from "./replaceWords";

const settings = definePluginSettings({
    rules: {
        type: OptionType.STRING,
        description: t("One rule per line, written word=replacement, for example fucking=freaking. A word with no replacement is removed. Whole words only, capitals are kept."),
        default: "fucking=freaking\nfuck=freak\nshit=shoot\ndamn=darn",
        multiline: true
    }
});

const clean = (text: string) => replaceWords(text, parseRules(settings.store.rules));

export default definePlugin({
    name: "ProfanityFilter",
    authors: [Devs.Tsar],
    description: "Swaps words you choose for milder ones in your own messages before they are sent, so \"fucking\" becomes \"freaking\". Each rule is word=replacement. A word with no replacement is removed, and if nothing is left the message is not sent.",
    tags: ["Chat", "Utility"],
    settings,

    onBeforeMessageSend(_, msg) {
        const before = msg.content;
        msg.content = clean(msg.content);
        if (before.trim() && !msg.content.trim()) {
            showToast(t("Message not sent: only filtered words were left."), Toasts.Type.FAILURE);
            return { cancel: true };
        }
    },

    onBeforeMessageEdit(_cid, _mid, msg) {
        msg.content = clean(msg.content);
    }
});
