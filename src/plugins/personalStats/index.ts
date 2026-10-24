/*
 * Vencord, a Discord client mod
 * Copyright (c) 2026 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { ApplicationCommandInputType, sendBotMessage } from "@api/Commands";
import * as DataStore from "@api/DataStore";
import { Devs } from "@utils/constants";
import definePlugin from "@utils/types";
import { ChannelStore, FluxDispatcher, UserStore } from "@webpack/common";

const STORE_KEY = "PersonalStats_data";
const TICK_MS = 30_000;
const SAVE_MS = 60_000;
const DM_CHANNEL = 1;

interface Day { sent: number; received: number; voiceMs: number; }
interface Data {
    since: number;
    days: Record<string, Day>;
    // Direct messages only, keyed by the other person's user id.
    dmSent: Record<string, number>;
    dmReceived: Record<string, number>;
}

let data: Data = { since: Date.now(), days: {}, dmSent: {}, dmReceived: {} };
let dirty = false;
let inVoice = false;
let lastTick = 0;
let tickTimer: ReturnType<typeof setInterval> | undefined;
let saveTimer: ReturnType<typeof setInterval> | undefined;

const dayKey = (t = Date.now()) => {
    const d = new Date(t);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
};

function today(): Day {
    return data.days[dayKey()] ??= { sent: 0, received: 0, voiceMs: 0 };
}

function dmPartner(channelId: string) {
    const ch = ChannelStore.getChannel(channelId);
    return ch?.type === DM_CHANNEL ? ch.recipients?.[0] as string | undefined : undefined;
}

function onMessage({ message, optimistic }: { message?: { author?: { id: string; }; channel_id: string; }; optimistic?: boolean; }) {
    if (!message?.author || optimistic) return;
    const me = UserStore.getCurrentUser()?.id;
    if (!me) return;
    const partner = dmPartner(message.channel_id);
    if (message.author.id === me) {
        today().sent++;
        if (partner) data.dmSent[partner] = (data.dmSent[partner] ?? 0) + 1;
    } else if (partner === message.author.id) {
        today().received++;
        data.dmReceived[partner] = (data.dmReceived[partner] ?? 0) + 1;
    } else return;
    dirty = true;
}

function onVoice({ voiceStates }: { voiceStates?: { userId: string; channelId?: string | null; }[]; }) {
    const me = UserStore.getCurrentUser()?.id;
    const mine = voiceStates?.find(v => v.userId === me);
    if (!mine) return;
    flushVoice();
    inVoice = !!mine.channelId;
}

function flushVoice() {
    const now = Date.now();
    if (inVoice && lastTick) {
        // A long gap means the computer slept, do not count it as time in a call.
        const gap = now - lastTick;
        if (gap < TICK_MS * 4) { today().voiceMs += gap; dirty = true; }
    }
    lastTick = now;
}

async function save() {
    if (!dirty) return;
    dirty = false;
    await DataStore.set(STORE_KEY, data);
}

const hours = (ms: number) => (ms / 3_600_000).toFixed(1);

function nameOf(id: string) {
    const u = UserStore.getUser(id);
    return u?.globalName || u?.username || id;
}

function top(map: Record<string, number>, n: number) {
    return Object.entries(map).sort((a, b) => b[1] - a[1]).slice(0, n);
}

function buildReport() {
    const all = Object.entries(data.days);
    const sum = (rows: [string, Day][]) => rows.reduce((a, [, d]) => ({ sent: a.sent + d.sent, received: a.received + d.received, voiceMs: a.voiceMs + d.voiceMs }), { sent: 0, received: 0, voiceMs: 0 });
    const t = today();
    const week = sum(all.filter(([k]) => k >= dayKey(Date.now() - 6 * 86_400_000)));
    const total = sum(all);

    const weekdays = [0, 0, 0, 0, 0, 0, 0];
    for (const [k, d] of all) weekdays[new Date(k + "T12:00:00").getDay()] += d.sent;
    const names = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
    const busiest = Math.max(...weekdays) > 0 ? names[weekdays.indexOf(Math.max(...weekdays))] : null;

    const friends: Record<string, number> = {};
    for (const [id, c] of Object.entries(data.dmSent)) friends[id] = (friends[id] ?? 0) + c;
    for (const [id, c] of Object.entries(data.dmReceived)) friends[id] = (friends[id] ?? 0) + c;

    const lines = [
        `**Your Discord+ stats** (counting since ${new Date(data.since).toLocaleDateString()})`,
        `Today: ${t.sent} sent, ${t.received} received in DMs, ${hours(t.voiceMs)} h in voice`,
        `Last 7 days: ${week.sent} sent, ${week.received} received in DMs, ${hours(week.voiceMs)} h in voice`,
        `All time: ${total.sent} sent, ${total.received} received in DMs, ${hours(total.voiceMs)} h in voice`
    ];
    if (busiest) lines.push(`You write most on ${busiest}s.`);
    const best = top(friends, 5);
    if (best.length) lines.push("", "**Most active DMs** (messages both ways)", ...best.map(([id, c], i) => `${i + 1}. ${nameOf(id)}: ${c}`));
    lines.push("", "Counted on this computer only. Server messages are counted as sent, never as received.");
    return lines.join("\n");
}

export default definePlugin({
    name: "PersonalStats",
    authors: [Devs.Tsar],
    description: "Counts your own activity on this computer: messages sent, direct messages received, time in voice, your busiest weekday and your most active DMs. Nothing leaves your PC. Type /stats to see it.",
    tags: ["Utility", "Fun"],

    async start() {
        const stored = await DataStore.get<Data>(STORE_KEY);
        if (stored) data = { ...data, ...stored };
        lastTick = Date.now();
        FluxDispatcher.subscribe("MESSAGE_CREATE", onMessage);
        FluxDispatcher.subscribe("VOICE_STATE_UPDATES", onVoice);
        tickTimer = setInterval(flushVoice, TICK_MS);
        saveTimer = setInterval(save, SAVE_MS);
    },

    async stop() {
        FluxDispatcher.unsubscribe("MESSAGE_CREATE", onMessage);
        FluxDispatcher.unsubscribe("VOICE_STATE_UPDATES", onVoice);
        clearInterval(tickTimer);
        clearInterval(saveTimer);
        flushVoice();
        await save();
    },

    commands: [{
        name: "stats",
        description: "Show your own Discord activity numbers",
        inputType: ApplicationCommandInputType.BUILT_IN,
        execute(_, ctx) {
            sendBotMessage(ctx.channel.id, { content: buildReport() });
        }
    }]
});
