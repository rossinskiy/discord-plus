/*
 * Vencord, a Discord client mod
 * Copyright (c) 2026 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { ApplicationCommandInputType, sendBotMessage } from "@api/Commands";
import * as DataStore from "@api/DataStore";
import { sparkline } from "@plugins/personalStats/sparkline";
import { Devs } from "@utils/constants";
import { t } from "@utils/i18n";
import definePlugin from "@utils/types";

import { dayKey, formatDuration, lastDays, prune, Usage } from "./usage";

const STORE_KEY = "Wellbeing_usage";
const TICK_SECONDS = 30;

let usage: Usage = {};
let timer: ReturnType<typeof setInterval> | undefined;
let sinceSave = 0;

const save = () => DataStore.set(STORE_KEY, usage);

function tick() {
    // Only count time when the window is on screen and you are in it, not when Discord sits in the background.
    if (document.hidden || !document.hasFocus()) return;
    const key = dayKey();
    usage[key] = (usage[key] ?? 0) + TICK_SECONDS;
    if (++sinceSave >= 2) {
        sinceSave = 0;
        usage = prune(usage);
        save();
    }
}

export default definePlugin({
    name: "Wellbeing",
    authors: [Devs.Tsar],
    description: "Keeps a private count of how long you actually spend in the Discord window each day, and shows it with /wellbeing. Time with Discord in the background is not counted. The numbers stay on your computer.",
    tags: ["Utility", "Privacy"],

    async start() {
        usage = await DataStore.get<Usage>(STORE_KEY) ?? {};
        timer = setInterval(tick, TICK_SECONDS * 1000);
    },

    stop() {
        clearInterval(timer);
        timer = undefined;
        save();
    },

    commands: [{
        name: "wellbeing",
        description: t("Show how long you spent in Discord today and this week"),
        inputType: ApplicationCommandInputType.BUILT_IN,
        execute(_, ctx) {
            const hour = t("h"), minute = t("min");
            const fmt = (s: number) => formatDuration(s, hour, minute);
            const week = lastDays(usage, 7);
            const [yesterday, today] = [week[5], week[6]];
            const average = week.reduce((a, b) => a + b, 0) / 7;
            const lines = [
                t("Today: {time}", { time: fmt(today) }),
                t("Yesterday: {time}", { time: fmt(yesterday) }),
                t("Average over the last 7 days: {time} a day", { time: fmt(average) }),
                t("Last 7 days (oldest first): {chart}", { chart: sparkline(week) })
            ];
            sendBotMessage(ctx.channel.id, { content: lines.join("\n") });
        }
    }]
});
