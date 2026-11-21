/*
 * Vencord, a Discord client mod
 * Copyright (c) 2026 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { definePluginSettings } from "@api/Settings";
import { Devs } from "@utils/constants";
import { t } from "@utils/i18n";
import definePlugin, { OptionType } from "@utils/types";

import { countWords } from "./countWords";

const settings = definePluginSettings({
    minWords: {
        type: OptionType.NUMBER,
        description: t("Show the count only for messages with at least this many words"),
        default: 30
    }
});

export default definePlugin({
    name: "WordCount",
    authors: [Devs.Tsar],
    description: "Shows how many words a long message has, under the message. Short messages are left alone.",
    tags: ["Chat", "Utility"],
    settings,

    renderMessageAccessory({ message }) {
        const words = countWords(message.content ?? "");
        if (words < Math.max(1, settings.store.minWords)) return null;
        return (
            <div style={{ fontSize: "12px", color: "var(--text-muted)", marginTop: "2px" }}>
                {t("{n} words", { n: words })}
            </div>
        );
    }
});
