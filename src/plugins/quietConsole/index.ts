/*
 * Vencord, a Discord client mod
 * Copyright (c) 2026 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { definePluginSettings } from "@api/Settings";
import { Devs } from "@utils/constants";
import { t } from "@utils/i18n";
import definePlugin, { OptionType, StartAt } from "@utils/types";

const settings = definePluginSettings({
    hideWarning: {
        type: OptionType.BOOLEAN,
        description: t("Hide the red \"Hold Up!\" scam warning Discord prints when you open DevTools"),
        default: true
    },
    hideRoutine: {
        type: OptionType.BOOLEAN,
        description: t("Hide Discord's routine log lines (RPCServer, WindowVisibilityVideoManager, settings protos, canvas hints)"),
        default: true
    }
});

const WARNING = [
    "Hold Up!",
    "If someone told you to copy/paste",
    "Pasting anything in here",
    "Unless you understand exactly what you are doing",
    "If you do understand exactly what you are doing"
];

const ROUTINE = [
    "[RPCServer:",
    "[WindowVisibilityVideoManager]",
    "[discord_protos.",
    "Canvas2D: Multiple readback operations"
];

const METHODS = ["log", "info", "warn", "debug"] as const;
const originals: Partial<Record<typeof METHODS[number], (...args: any[]) => void>> = {};

function isNoise(args: unknown[]) {
    // Discord's logger may put the tag in any string argument, so look at all of them.
    const text = args.filter(a => typeof a === "string").join(" ");
    if (!text) return false;
    if (settings.store.hideWarning && WARNING.some(s => text.includes(s))) return true;
    if (settings.store.hideRoutine && ROUTINE.some(s => text.includes(s))) return true;
    return false;
}

export default definePlugin({
    name: "QuietConsole",
    authors: [Devs.Tsar],
    description: "Hides the \"Hold Up!\" warning and Discord's routine log lines in the DevTools console, so your own messages and real errors are easy to see. Network errors (404, 429) are printed by the browser itself and cannot be hidden. Unlike NoDevtoolsWarning, it does not change how Discord stores your token.",
    tags: ["Developers", "Console"],
    startAt: StartAt.Init,
    settings,

    start() {
        for (const m of METHODS) {
            const original = console[m];
            originals[m] = original;
            console[m] = function (this: unknown, ...args: unknown[]) {
                if (isNoise(args)) return;
                return original.apply(this, args);
            };
        }
    },

    stop() {
        for (const m of METHODS) {
            const original = originals[m];
            if (original) console[m] = original;
            delete originals[m];
        }
    }
});
