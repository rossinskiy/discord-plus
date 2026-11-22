/*
 * Vencord, a Discord client mod
 * Copyright (c) 2026 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { definePluginSettings } from "@api/Settings";
import { getUserSettingLazy } from "@api/UserSettings";
import { Devs } from "@utils/constants";
import { t } from "@utils/i18n";
import definePlugin, { OptionType } from "@utils/types";

import { desiredTheme, Theme } from "./theme";

const ThemeSetting = getUserSettingLazy<Theme>("appearance", "theme")!;

const settings = definePluginSettings({
    dayStart: {
        type: OptionType.STRING,
        description: t("Switch to the light theme at this time (24 hour clock)"),
        default: "07:00"
    },
    nightStart: {
        type: OptionType.STRING,
        description: t("Switch to the dark theme at this time"),
        default: "20:00"
    }
});

const CHECK_MS = 60_000;

let timer: ReturnType<typeof setInterval> | undefined;
// The theme this plugin chose last. It only acts when the wanted theme changes, so you can still switch by hand in between.
let lastWanted: Theme | null = null;

function check() {
    const now = new Date();
    const wanted = desiredTheme(now.getHours() * 60 + now.getMinutes(), settings.store.dayStart, settings.store.nightStart);
    if (!wanted || wanted === lastWanted) return;
    lastWanted = wanted;
    if (ThemeSetting.getSetting() !== wanted) ThemeSetting.updateSetting(wanted);
}

export default definePlugin({
    name: "AutoThemeSwitcher",
    authors: [Devs.Tsar],
    description: "Switches Discord between the light and dark theme by the time of day, for example light from 07:00 and dark from 20:00. It acts only at those times, so you can still change the theme by hand in between.",
    tags: ["Appearance", "Customisation"],
    settings,

    start() {
        lastWanted = null;
        check();
        timer = setInterval(check, CHECK_MS);
    },

    stop() {
        clearInterval(timer);
        timer = undefined;
    }
});
