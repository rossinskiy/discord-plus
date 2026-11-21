/*
 * Vencord, a Discord client mod
 * Copyright (c) 2026 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { ApplicationCommandInputType, ApplicationCommandOptionType, findOption, sendBotMessage } from "@api/Commands";
import { showNotification } from "@api/Notifications";
import { listVoiceChannels } from "@plugins/voiceChannelSearch/channels";
import { isFull, rankVoice } from "@plugins/voiceChannelSearch/rank";
import { Devs } from "@utils/constants";
import { t } from "@utils/i18n";
import definePlugin from "@utils/types";
import { findByPropsLazy } from "@webpack";
import { ChannelStore, VoiceStateStore } from "@webpack/common";

const { selectVoiceChannel } = findByPropsLazy("selectVoiceChannel", "selectChannel");

const CHECK_MS = 3000;
const GIVE_UP_MS = 30 * 60_000;

let timer: ReturnType<typeof setInterval> | undefined;

function stopWaiting() {
    clearInterval(timer);
    timer = undefined;
}

function startWaiting(channelId: string) {
    stopWaiting();
    const deadline = Date.now() + GIVE_UP_MS;
    timer = setInterval(() => {
        const channel = ChannelStore.getChannel(channelId);
        if (!channel || Date.now() > deadline) {
            stopWaiting();
            showNotification({ title: t("Stopped waiting"), body: t("The voice channel is gone or you waited 30 minutes.") });
            return;
        }
        const count = Object.keys(VoiceStateStore.getVoiceStatesForChannel(channelId) ?? {}).length;
        if (isFull({ count, limit: channel.userLimit ?? 0 })) return;

        stopWaiting();
        selectVoiceChannel(channelId);
        showNotification({ title: t("A slot opened"), body: t("Joining {name}.", { name: channel.name }) });
    }, CHECK_MS);
}

export default definePlugin({
    name: "WaitForSlot",
    authors: [Devs.Tsar],
    description: "Run /waitforslot with the name of a full voice channel and Discord joins it for you the moment a slot opens. It checks every few seconds and gives up after 30 minutes. Discord has to stay open.",
    tags: ["Voice", "Utility"],

    stop: stopWaiting,

    commands: [{
        name: "waitforslot",
        description: t("Join a full voice channel as soon as there is room"),
        inputType: ApplicationCommandInputType.BUILT_IN,
        options: [
            { name: "channel", description: t("Part of the voice channel name, or \"off\" to stop waiting"), type: ApplicationCommandOptionType.STRING, required: true }
        ],
        execute(args, ctx) {
            const query: string = findOption(args, "channel", "").trim();
            if (query.toLowerCase() === "off") {
                stopWaiting();
                return sendBotMessage(ctx.channel.id, { content: t("No longer waiting.") });
            }

            const full = rankVoice(listVoiceChannels(), query).filter(isFull);
            if (!full.length) return sendBotMessage(ctx.channel.id, { content: t("No full voice channel matches \"{name}\". Only channels with a user limit that is reached can be waited for.", { name: query }) });

            const [target] = full;
            startWaiting(target.id);
            const extra = full.length > 1 ? " " + t("{n} full channels matched, so I picked the first. Be more exact to choose another.", { n: full.length }) : "";
            sendBotMessage(ctx.channel.id, { content: t("Waiting for a slot in <#{id}> ({guild}). Stop with `/waitforslot channel:off`.", { id: target.id, guild: target.guildName }) + extra });
        }
    }]
});
