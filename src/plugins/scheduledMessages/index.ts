/*
 * Vencord, a Discord client mod
 * Copyright (c) 2026 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { ApplicationCommandInputType, ApplicationCommandOptionType, findOption, sendBotMessage } from "@api/Commands";
import * as DataStore from "@api/DataStore";
import { showNotification } from "@api/Notifications";
import { parseDuration } from "@plugins/reminders/parseDuration";
import { Devs } from "@utils/constants";
import { sendMessage } from "@utils/discord";
import { t } from "@utils/i18n";
import definePlugin from "@utils/types";
import { ChannelStore, showToast, Toasts } from "@webpack/common";
import { nanoid } from "nanoid";

import { parseClock } from "./parseClock";

const STORE_KEY = "ScheduledMessages_data";
const CHECK_INTERVAL_MS = 5_000;
// A message that came due while Discord was closed is not sent later, it would arrive at a surprising moment.
const LATE_LIMIT_MS = 2 * 60_000;
const MIN_REPEAT_MS = 10 * 60_000;

interface Scheduled {
    id: string;
    channelId: string;
    content: string;
    dueAt: number;
    // Set for a message that repeats with this gap.
    everyMs?: number;
}

let items: Scheduled[] = [];
let timer: ReturnType<typeof setInterval> | undefined;
let busy = false;

const save = () => DataStore.set(STORE_KEY, items);

function channelName(id: string) {
    const ch = ChannelStore.getChannel(id);
    if (!ch) return t("a channel");
    return ch.name ? `#${ch.name}` : t("a direct message");
}

function excerpt(text: string) {
    const one = text.replace(/\s+/g, " ").trim();
    return one.length > 60 ? one.slice(0, 57) + "..." : one;
}

function formatWhen(ms: number) {
    return new Date(ms).toLocaleString([], { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" });
}

async function tick() {
    if (busy) return;
    busy = true;
    try {
        const now = Date.now();
        const due = items.filter(i => i.dueAt <= now);
        if (!due.length) return;

        items = items.filter(i => i.dueAt > now);
        // A repeating message goes back in the queue at its next future time, even if this one was missed.
        for (const item of due) {
            if (!item.everyMs) continue;
            const steps = Math.floor((now - item.dueAt) / item.everyMs) + 1;
            items.push({ ...item, dueAt: item.dueAt + steps * item.everyMs });
        }
        items.sort((a, b) => a.dueAt - b.dueAt);
        await save();

        for (const item of due) {
            if (now - item.dueAt > LATE_LIMIT_MS) {
                showNotification({ title: t("Scheduled message missed"), body: t("Discord was closed at {when}. Not sent: {text}", { when: formatWhen(item.dueAt), text: excerpt(item.content) }) });
                continue;
            }
            try {
                await sendMessage(item.channelId, { content: item.content });
                showToast(t("Sent to {channel}", { channel: channelName(item.channelId) }), Toasts.Type.SUCCESS);
            } catch (err) {
                console.error("[ScheduledMessages] send failed", err);
                showNotification({ title: t("Scheduled message failed"), body: t("Could not send: {text}", { text: excerpt(item.content) }) });
            }
        }
    } finally {
        busy = false;
    }
}

export default definePlugin({
    name: "ScheduledMessages",
    authors: [Devs.Tsar],
    description: "Write a message now and have it sent later with /schedule. Discord has to be open at that time. A message that comes due while Discord is closed is not sent, you get a notice instead.",
    tags: ["Utility", "Chat"],

    async start() {
        items = await DataStore.get<Scheduled[]>(STORE_KEY) ?? [];
        tick();
        timer = setInterval(tick, CHECK_INTERVAL_MS);
    },

    stop() {
        clearInterval(timer);
        timer = undefined;
    },

    commands: [
        {
            name: "schedule",
            description: t("Send a message in this channel later"),
            inputType: ApplicationCommandInputType.BUILT_IN,
            options: [
                { name: "in", description: t("How long to wait, e.g. 10m, 2h30m, 1d"), type: ApplicationCommandOptionType.STRING, required: false },
                { name: "at", description: t("Or a time of day, e.g. 18:30 or 6pm. It means the next time it is that time."), type: ApplicationCommandOptionType.STRING, required: false },
                { name: "message", description: t("What to send"), type: ApplicationCommandOptionType.STRING, required: true },
                { name: "repeat", description: t("Send it again every time the delay passes"), type: ApplicationCommandOptionType.BOOLEAN, required: false }
            ],
            execute(args, ctx) {
                const inStr: string = findOption(args, "in", "");
                const content: string = findOption(args, "message", "");
                const atStr: string = findOption(args, "at", "");
                if (!inStr && !atStr) return sendBotMessage(ctx.channel.id, { content: t("Give a delay in `in` or a time of day in `at`.") });
                if (inStr && atStr) return sendBotMessage(ctx.channel.id, { content: t("Use either `in` or `at`, not both.") });
                if (!content.trim()) return sendBotMessage(ctx.channel.id, { content: t("The message is empty.") });

                const dueAt = atStr ? parseClock(atStr) : null;
                const delay = inStr ? parseDuration(inStr) : null;
                if (atStr && dueAt == null) return sendBotMessage(ctx.channel.id, { content: t("Couldn't understand \"{value}\". Try `18:30` or `6pm`.", { value: atStr }) });
                if (inStr && !delay) return sendBotMessage(ctx.channel.id, { content: t("Couldn't understand \"{value}\". Try `10m`, `2h30m` or `1d`.", { value: inStr }) });
                // At a time of day, "repeat" means every day at that time.
                const ms = delay ?? 86_400_000;

                const repeat: boolean = findOption(args, "repeat", false);
                // A repeating message that fires every few seconds would be spam, so the gap has a floor.
                if (repeat && ms < MIN_REPEAT_MS) return sendBotMessage(ctx.channel.id, { content: t("A repeating message needs a delay of at least 10 minutes.") });

                const item: Scheduled = { id: nanoid(), channelId: ctx.channel.id, content, dueAt: dueAt ?? Date.now() + ms, everyMs: repeat ? ms : undefined };
                items.push(item);
                items.sort((a, b) => a.dueAt - b.dueAt);
                save();
                sendBotMessage(ctx.channel.id, { content: t("Scheduled for {when}. See them all with `/scheduled`. Discord has to be open then.", { when: formatWhen(item.dueAt) }) + (repeat ? " " + t("It repeats. Cancel it with `/scheduled cancel:<number>` to stop it.") : "") });
            }
        },
        {
            name: "scheduled",
            description: t("List your scheduled messages, or cancel one by its number"),
            inputType: ApplicationCommandInputType.BUILT_IN,
            options: [
                { name: "cancel", description: t("Number from the list to cancel"), type: ApplicationCommandOptionType.INTEGER, required: false }
            ],
            execute(args, ctx) {
                const cancel: number = findOption(args, "cancel", 0);
                if (cancel) {
                    const target = items[cancel - 1];
                    if (!target) return sendBotMessage(ctx.channel.id, { content: t("There is no message number {n}.", { n: cancel }) });
                    items = items.filter(i => i.id !== target.id);
                    save();
                    return sendBotMessage(ctx.channel.id, { content: t("Cancelled: {text}", { text: excerpt(target.content) }) });
                }
                if (!items.length) return sendBotMessage(ctx.channel.id, { content: t("Nothing is scheduled.") });
                const lines = items.map((i, n) => `${n + 1}. ${formatWhen(i.dueAt)}, ${channelName(i.channelId)}: ${excerpt(i.content)}${i.everyMs ? " " + t("(repeats)") : ""}`);
                sendBotMessage(ctx.channel.id, { content: lines.join("\n") + "\n\n" + t("Cancel one with `/scheduled cancel:<number>`.") });
            }
        }
    ]
});
