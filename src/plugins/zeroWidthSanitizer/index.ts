/*
 * Vencord, a Discord client mod
 * Copyright (c) 2026 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { Devs } from "@utils/constants";
import definePlugin from "@utils/types";

import { sanitize } from "./sanitize";

export default definePlugin({
    name: "ZeroWidthSanitizer",
    authors: [Devs.Tsar],
    description: "Removes invisible zero width characters from the messages you send or edit. They sneak in when you copy text from web pages, and they break links, commands and word searches. Emoji and scripts that need joiners are left alone.",
    tags: ["Chat", "Utility"],

    onBeforeMessageSend(_, msg) {
        msg.content = sanitize(msg.content);
    },

    onBeforeMessageEdit(_cid, _mid, msg) {
        msg.content = sanitize(msg.content);
    }
});
