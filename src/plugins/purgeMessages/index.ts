/*
 * Vencord, a Discord client mod
 * Copyright (c) 2026 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { ApplicationCommandInputType, ApplicationCommandOptionType, findOption, sendBotMessage } from "@api/Commands";
import { Devs } from "@utils/constants";
import definePlugin from "@utils/types";
import { Alerts, ChannelStore, RestAPI, Toasts, UserStore } from "@webpack/common";

const PAGE_SIZE = 100;
// About 40 deletions a minute, with a random wobble so the pace is not a perfect metronome.
const DELAY_MIN_MS = 1200;
const DELAY_MAX_MS = 1800;
const MAX_FAILS_IN_ROW = 5;
// Normal messages and replies. System messages (joins, pins) cannot be deleted by their author.
const DELETABLE_TYPES = new Set([0, 19]);

interface Job {
    channelId: string;
    total: number;
    deleted: number;
    cancelled: boolean;
}

let job: Job | null = null;

const sleep = (ms: number) => new Promise(r => setTimeout(r, ms));
const pause = () => sleep(DELAY_MIN_MS + Math.random() * (DELAY_MAX_MS - DELAY_MIN_MS));

function channelName(id: string) {
    const ch = ChannelStore.getChannel(id);
    if (!ch) return "this chat";
    return ch.name ? `#${ch.name}` : "this conversation";
}

function etaText(count: number) {
    const minutes = Math.ceil(count / 40);
    return minutes < 60 ? `about ${minutes} min` : `about ${(minutes / 60).toFixed(1)} h`;
}

async function deleteOne(channelId: string, messageId: string) {
    for (let attempt = 0; attempt < 3; attempt++) {
        try {
            await RestAPI.del({ url: `/channels/${channelId}/messages/${messageId}` });
            return true;
        } catch (err: any) {
            const status = err?.status;
            if (status === 404) return true; // already gone
            if (status === 429) {
                const wait = Number(err?.body?.retry_after ?? 5);
                await sleep(Math.ceil(wait * 1000) + 500);
                continue;
            }
            return false;
        }
    }
    return false;
}

async function run(current: Job) {
    const me = UserStore.getCurrentUser().id;
    const toastId = Toasts.genId();
    const progress = () => Toasts.show({ id: toastId, type: Toasts.Type.MESSAGE, message: `Deleting... ${current.deleted} of ${current.total}` });
    let before: string | undefined;
    let fails = 0;
    let reason = "";

    try {
        progress();
        outer: while (current.deleted < current.total) {
            const { body } = await RestAPI.get({
                url: `/channels/${current.channelId}/messages`,
                query: { limit: PAGE_SIZE, ...(before ? { before } : {}) }
            });
            if (!body?.length) { reason = "no older messages of yours"; break; }
            before = body[body.length - 1].id;

            for (const m of body) {
                if (current.cancelled) { reason = "cancelled"; break outer; }
                if (m.author?.id !== me || !DELETABLE_TYPES.has(m.type)) continue;

                if (await deleteOne(current.channelId, m.id)) {
                    fails = 0;
                    current.deleted++;
                    if (current.deleted % 5 === 0) progress();
                } else if (++fails >= MAX_FAILS_IN_ROW) {
                    reason = "Discord kept refusing, stopped";
                    break outer;
                }
                if (current.deleted >= current.total) break outer;
                await pause();
            }
            if (body.length < PAGE_SIZE) { reason = "no older messages of yours"; break; }
        }
    } catch (err) {
        console.error("[PurgeMessages]", err);
        reason = "network error, stopped";
    } finally {
        job = null;
    }

    const done = `Deleted ${current.deleted} of ${current.total} messages in ${channelName(current.channelId)}${reason ? ` (${reason})` : ""}.`;
    Toasts.show({ id: toastId, type: current.deleted >= current.total ? Toasts.Type.SUCCESS : Toasts.Type.MESSAGE, message: done });
    sendBotMessage(current.channelId, { content: done });
}

export default definePlugin({
    name: "PurgeMessages",
    authors: [Devs.Tsar],
    description: "Type /purge with a number to delete that many of your own messages in the current chat, newest first. It runs at a slow, safe pace until done. /purgecancel stops it. Deleted messages cannot be brought back.",
    tags: ["Utility", "Privacy"],

    stop() {
        if (job) job.cancelled = true;
    },

    commands: [
        {
            name: "purge",
            description: "Delete your last N messages in this chat (cannot be undone)",
            inputType: ApplicationCommandInputType.BUILT_IN,
            options: [{
                name: "count",
                description: "How many of your messages to delete",
                type: ApplicationCommandOptionType.INTEGER,
                required: true
            }],
            execute(args, ctx) {
                const count = Number(findOption(args, "count", 0));
                if (!Number.isInteger(count) || count < 1) {
                    sendBotMessage(ctx.channel.id, { content: "Give a whole number, for example `/purge count:50`." });
                    return;
                }
                if (job) {
                    sendBotMessage(ctx.channel.id, { content: `Already deleting in ${channelName(job.channelId)} (${job.deleted} of ${job.total}). Type /purgecancel to stop it first.` });
                    return;
                }
                const channelId = ctx.channel.id;
                Alerts.show({
                    title: `Delete ${count} of your messages?`,
                    body: `This removes your last ${count} messages in ${channelName(channelId)}, newest first, ${etaText(count)}. Deleted messages cannot be restored. You can stop it any time with /purgecancel, but what was already deleted stays deleted.`,
                    confirmText: "Delete",
                    cancelText: "Keep them",
                    onConfirm() {
                        if (job) return;
                        job = { channelId, total: count, deleted: 0, cancelled: false };
                        run(job);
                    }
                });
            }
        },
        {
            name: "purgecancel",
            description: "Stop the running /purge",
            inputType: ApplicationCommandInputType.BUILT_IN,
            execute(_, ctx) {
                if (!job) {
                    sendBotMessage(ctx.channel.id, { content: "Nothing is being deleted right now." });
                    return;
                }
                job.cancelled = true;
                sendBotMessage(ctx.channel.id, { content: "Stopping after the current message." });
            }
        }
    ]
});
