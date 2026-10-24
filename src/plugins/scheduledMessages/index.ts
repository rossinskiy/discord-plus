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
import definePlugin from "@utils/types";
import { ChannelStore, showToast, Toasts } from "@webpack/common";
import { nanoid } from "nanoid";

const STORE_KEY = "ScheduledMessages_data";
const CHECK_INTERVAL_MS = 5_000;
// A message that came due while Discord was closed is not sent later, it would arrive at a surprising moment.
const LATE_LIMIT_MS = 2 * 60_000;

interface Scheduled {
    id: string;
    channelId: string;
    content: string;
    dueAt: number;
}

let items: Scheduled[] = [];
let timer: ReturnType<typeof setInterval> | undefined;
let busy = false;

const save = () => DataStore.set(STORE_KEY, items);

function channelName(id: string) {
    const ch = ChannelStore.getChannel(id);
    if (!ch) return "a channel";
    return ch.name ? `#${ch.name}` : "a direct message";
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
        await save();

        for (const item of due) {
            if (now - item.dueAt > LATE_LIMIT_MS) {
                showNotification({ title: "Scheduled message missed", body: `Discord was closed at ${formatWhen(item.dueAt)}. Not sent: ${excerpt(item.content)}` });
                continue;
            }
            try {
                await sendMessage(item.channelId, { content: item.content });
                showToast(`Sent to ${channelName(item.channelId)}`, Toasts.Type.SUCCESS);
            } catch (err) {
                console.error("[ScheduledMessages] send failed", err);
                showNotification({ title: "Scheduled message failed", body: `Could not send: ${excerpt(item.content)}` });
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
            description: "Send a message in this channel later",
            inputType: ApplicationCommandInputType.BUILT_IN,
            options: [
                { name: "in", description: "How long to wait, e.g. 10m, 2h30m, 1d", type: ApplicationCommandOptionType.STRING, required: true },
                { name: "message", description: "What to send", type: ApplicationCommandOptionType.STRING, required: true }
            ],
            execute(args, ctx) {
                const inStr: string = findOption(args, "in", "");
                const content: string = findOption(args, "message", "");
                const ms = parseDuration(inStr);
                if (!ms) return sendBotMessage(ctx.channel.id, { content: `Couldn't understand "${inStr}". Try \`10m\`, \`2h30m\` or \`1d\`.` });
                if (!content.trim()) return sendBotMessage(ctx.channel.id, { content: "The message is empty." });

                const item: Scheduled = { id: nanoid(), channelId: ctx.channel.id, content, dueAt: Date.now() + ms };
                items.push(item);
                items.sort((a, b) => a.dueAt - b.dueAt);
                save();
                sendBotMessage(ctx.channel.id, { content: `Scheduled for ${formatWhen(item.dueAt)}. See them all with \`/scheduled\`. Discord has to be open then.` });
            }
        },
        {
            name: "scheduled",
            description: "List your scheduled messages, or cancel one by its number",
            inputType: ApplicationCommandInputType.BUILT_IN,
            options: [
                { name: "cancel", description: "Number from the list to cancel", type: ApplicationCommandOptionType.INTEGER, required: false }
            ],
            execute(args, ctx) {
                const cancel: number = findOption(args, "cancel", 0);
                if (cancel) {
                    const target = items[cancel - 1];
                    if (!target) return sendBotMessage(ctx.channel.id, { content: `There is no message number ${cancel}.` });
                    items = items.filter(i => i.id !== target.id);
                    save();
                    return sendBotMessage(ctx.channel.id, { content: `Cancelled: ${excerpt(target.content)}` });
                }
                if (!items.length) return sendBotMessage(ctx.channel.id, { content: "Nothing is scheduled." });
                const lines = items.map((i, n) => `${n + 1}. ${formatWhen(i.dueAt)}, ${channelName(i.channelId)}: ${excerpt(i.content)}`);
                sendBotMessage(ctx.channel.id, { content: lines.join("\n") + "\n\nCancel one with `/scheduled cancel:<number>`." });
            }
        }
    ]
});
