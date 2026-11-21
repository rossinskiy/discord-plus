/*
 * Vencord, a Discord client mod
 * Copyright (c) 2026 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { ApplicationCommandInputType, ApplicationCommandOptionType, findOption, sendBotMessage } from "@api/Commands";
import { definePluginSettings } from "@api/Settings";
import { parseDuration } from "@plugins/reminders/parseDuration";
import { Devs } from "@utils/constants";
import { t } from "@utils/i18n";
import definePlugin, { OptionType } from "@utils/types";
import { RestAPI, UserStore } from "@webpack/common";

const MIN_DELAY_MS = 5_000;
const MAX_DELAY_MS = 7 * 86_400_000;

const settings = definePluginSettings({
    delay: {
        type: OptionType.STRING,
        description: t("Delete your new messages after this long, e.g. 30s, 10m, 2h. Empty means off. Also set with /selfdestruct."),
        default: ""
    }
});

const timers = new Set<ReturnType<typeof setTimeout>>();

function currentDelay() {
    const raw = settings.store.delay.trim();
    if (!raw) return null;
    const ms = parseDuration(raw);
    return ms && ms >= MIN_DELAY_MS && ms <= MAX_DELAY_MS ? ms : null;
}

export default definePlugin({
    name: "SelfDestruct",
    authors: [Devs.Tsar],
    description: "Deletes the messages you send after a delay you choose, such as 10 minutes. Discord has to stay open until then, a message waiting when you close it stays.",
    tags: ["Chat", "Privacy"],
    settings,

    flux: {
        MESSAGE_CREATE({ message }: { message: any; }) {
            const ms = currentDelay();
            if (!ms || message?.state || message?.author?.id !== UserStore.getCurrentUser()?.id) return;
            // Only normal messages and replies can be deleted by their author.
            if (message.type !== 0 && message.type !== 19) return;

            const timer = setTimeout(() => {
                timers.delete(timer);
                RestAPI.del({ url: `/channels/${message.channel_id}/messages/${message.id}` })
                    .catch(err => { if (err?.status !== 404) console.error("[SelfDestruct] delete failed", err); });
            }, ms);
            timers.add(timer);
        }
    },

    stop() {
        timers.forEach(clearTimeout);
        timers.clear();
    },

    commands: [{
        name: "selfdestruct",
        description: t("Delete your new messages after a delay. Use \"off\" to stop."),
        inputType: ApplicationCommandInputType.BUILT_IN,
        options: [
            { name: "after", description: t("How long to wait, e.g. 30s, 10m, 2h, or off"), type: ApplicationCommandOptionType.STRING, required: true }
        ],
        execute(args, ctx) {
            const after: string = findOption(args, "after", "").trim();
            if (after.toLowerCase() === "off") {
                settings.store.delay = "";
                return sendBotMessage(ctx.channel.id, { content: t("Self-destruct is off.") });
            }
            const ms = parseDuration(after);
            if (!ms || ms < MIN_DELAY_MS || ms > MAX_DELAY_MS)
                return sendBotMessage(ctx.channel.id, { content: t("Give a delay between 5 seconds and 7 days, like `30s`, `10m` or `2h`.") });
            settings.store.delay = after;
            sendBotMessage(ctx.channel.id, { content: t("Your new messages will be deleted {after} after sending. Turn it off with `/selfdestruct after:off`.", { after }) });
        }
    }]
});
