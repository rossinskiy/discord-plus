/*
 * Vencord, a Discord client mod
 * Copyright (c) 2026 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { definePluginSettings } from "@api/Settings";
import { Devs } from "@utils/constants";
import { t } from "@utils/i18n";
import definePlugin, { OptionType } from "@utils/types";

import { inWindow, parseHM } from "./window";

const settings = definePluginSettings({
    from: {
        type: OptionType.STRING,
        description: t("Quiet from this time, 24 hour clock, e.g. 22:00"),
        default: "22:00"
    },
    to: {
        type: OptionType.STRING,
        description: t("Quiet until this time, e.g. 08:00. The window may cross midnight."),
        default: "08:00"
    }
});

export default definePlugin({
    name: "QuietHours",
    authors: [Devs.Tsar],
    description: "Mutes Discord's notification and in-app sounds during a time window you set, such as 22:00 to 08:00. Voice chat audio is not touched.",
    tags: ["Notifications", "Utility"],
    settings,

    // 1 normally, 0 inside the quiet window. Multiplied into the volume Discord uses for its own sounds.
    quietFactor() {
        const start = parseHM(settings.store.from);
        const end = parseHM(settings.store.to);
        if (start == null || end == null) return 1;
        const now = new Date();
        return inWindow(now.getHours() * 60 + now.getMinutes(), start, end) ? 0 : 1;
    },

    patches: [
        {
            find: "ensureAudio(){",
            replacement: {
                match: /(?=Math\.min\(\i\.\i\.getOutputVolume\(\)\/100)/g,
                replace: "$self.quietFactor()*"
            }
        }
    ]
});
