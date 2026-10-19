/*
 * Vencord, a Discord client mod
 * Copyright (c) 2026 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { definePluginSettings } from "@api/Settings";
import { Devs } from "@utils/constants";
import definePlugin, { OptionType } from "@utils/types";
import { findStoreLazy } from "@webpack";
import { ChannelStore, FluxDispatcher, RestAPI, RunningGameStore, showToast, Toasts } from "@webpack/common";

const QuestsStore = findStoreLazy("QuestStore");

const settings = definePluginSettings({
    showToasts: {
        type: OptionType.BOOLEAN,
        description: "Show a toast when a quest starts and when it finishes",
        default: true
    },
    autoClaim: {
        type: OptionType.BOOLEAN,
        description: "Automatically claim the reward once a quest is completed (some rewards need a captcha or extra info and must be claimed by hand)",
        default: true
    },
    checkMinutes: {
        type: OptionType.NUMBER,
        description: "How often to look for newly accepted quests (minutes)",
        default: 5
    }
});

const TASK_TYPES = ["WATCH_VIDEO", "WATCH_VIDEO_ON_MOBILE", "PLAY_ON_DESKTOP", "PLAY_ACTIVITY"] as const;
type TaskType = typeof TASK_TYPES[number];

let running = false;
let stopped = true;
let checkTimer: ReturnType<typeof setTimeout> | undefined;
const failedQuests = new Set<string>();
const claimAttempted = new Set<string>();

const sleep = (ms: number) => new Promise<void>(r => setTimeout(r, ms));
const rand = (min: number, max: number) => min + Math.random() * (max - min);
const randInt = (min: number, max: number) => Math.floor(rand(min, max + 1));

function toast(message: string, type = Toasts.Type.MESSAGE) {
    if (settings.store.showToasts) showToast(message, type);
}

function getTaskType(quest: any): TaskType | undefined {
    const tasks = quest?.config?.taskConfigV2?.tasks;
    return tasks && TASK_TYPES.find(t => tasks[t] != null);
}

function findPendingQuest() {
    const quests: any[] = [...QuestsStore.quests.values()];
    return quests.find(q =>
        !failedQuests.has(q.id) &&
        q.userStatus?.enrolledAt &&
        !q.userStatus?.completedAt &&
        new Date(q.config.expiresAt).getTime() > Date.now() &&
        getTaskType(q)
    );
}

function getProgress(quest: any, task: TaskType): number {
    return Math.floor(quest.userStatus?.progress?.[task]?.value ?? 0);
}

async function completeVideo(quest: any, task: TaskType) {
    const needed: number = quest.config.taskConfigV2.tasks[task].target;
    const enrolledAt = new Date(quest.userStatus.enrolledAt).getTime();
    const maxFuture = 10;
    let done = getProgress(quest, task);
    let completed = false;

    // The server rejects timestamps further ahead than real elapsed time since
    // enrolling (plus a small margin), so advance in small, uneven steps -
    // a human watching doesn't check in on a fixed clock tick.
    while (!stopped && done < needed) {
        const maxAllowed = Math.floor((Date.now() - enrolledAt) / 1000) + maxFuture;
        const speed = rand(3, 9);
        if (maxAllowed - done >= speed) {
            const timestamp = Math.min(needed, done + speed);
            const res = await RestAPI.post({
                url: `/quests/${quest.id}/video-progress`,
                body: { timestamp: Math.min(needed, timestamp + Math.random()) }
            });
            completed = res.body?.completed_at != null;
            done = timestamp;
        }
        // Occasionally sit on the current timestamp a bit longer, as if the
        // window lost focus or attention drifted for a moment.
        await sleep(rand(800, 1600) + (Math.random() < 0.08 ? rand(2000, 6000) : 0));
    }

    if (!stopped && !completed) {
        await RestAPI.post({ url: `/quests/${quest.id}/video-progress`, body: { timestamp: needed } });
    }
}

async function completeActivity(quest: any, task: TaskType) {
    const needed: number = quest.config.taskConfigV2.tasks[task].target;
    const channel = (ChannelStore as any).getSortedPrivateChannels?.()[0];
    if (!channel) throw new Error("no private channel available for the activity heartbeat");

    const streamKey = `call:${channel.id}:1`;

    while (!stopped) {
        const res = await RestAPI.post({
            url: `/quests/${quest.id}/heartbeat`,
            body: { stream_key: streamKey, terminal: false }
        });
        if ((res.body?.progress?.[task]?.value ?? 0) >= needed) {
            await RestAPI.post({
                url: `/quests/${quest.id}/heartbeat`,
                body: { stream_key: streamKey, terminal: true }
            });
            return;
        }
        await sleep(rand(16_000, 24_000));
    }
}

async function completeDesktopGame(quest: any, task: TaskType) {
    const needed: number = quest.config.taskConfigV2.tasks[task].target;
    const applicationId: string | undefined =
        quest.config.taskConfigV2.tasks[task].applications?.[0]?.id ?? quest.config.application?.id;
    if (!applicationId) throw new Error("quest has no application id");

    const res = await RestAPI.get({ url: `/applications/public?application_ids=${applicationId}` });
    const app = res.body?.[0];
    if (!app) throw new Error("application info not found");

    const exe = (app.executables ?? []).find((e: any) => e.os === "win32") ?? app.executables?.[0];
    if (!exe) throw new Error("application has no known executable");

    const exeName: string = exe.name.replace(">", "");
    // A real launch doesn't happen the instant the quest is accepted - leave
    // a believable gap, as if the user went and opened the game themselves.
    await sleep(rand(8_000, 25_000));
    if (stopped) return;

    const pid = randInt(4000, 28000);
    const fakeGame = {
        cmdLine: `C:\\Program Files\\${app.name}\\${exeName}`,
        exeName,
        exePath: `c:/program files/${app.name.toLowerCase()}/${exeName}`,
        hidden: false,
        isLauncher: false,
        id: applicationId,
        name: app.name,
        pid,
        pidPath: [pid],
        processName: app.name,
        start: Date.now()
    };

    const store = RunningGameStore as any;
    const realGames = store.getRunningGames();
    const realGetRunningGames = store.getRunningGames;
    const realGetGameForPID = store.getGameForPID;
    const fakeGames = [fakeGame];

    const assertFakeGame = () => {
        // Discord periodically rescans actually-running processes and will
        // overwrite our override, so we have to keep reapplying it for as
        // long as this quest is running, not just once at the start.
        store.getRunningGames = () => fakeGames;
        store.getGameForPID = (p: number) => fakeGames.find(g => g.pid === p);
        FluxDispatcher.dispatch({ type: "RUNNING_GAMES_CHANGE", removed: realGames, added: [fakeGame], games: fakeGames });
    };
    assertFakeGame();
    const reassert = setInterval(assertFakeGame, 4000);

    const restore = () => {
        clearInterval(reassert);
        store.getRunningGames = realGetRunningGames;
        store.getGameForPID = realGetGameForPID;
        FluxDispatcher.dispatch({ type: "RUNNING_GAMES_CHANGE", removed: [fakeGame], added: [], games: realGames });
    };

    // Discord's own quest manager sends the heartbeats once it sees the game
    // running; we only watch the progress it reports back.
    try {
        await new Promise<void>((resolve, reject) => {
            const onHeartbeat = (data: any) => {
                const status = data?.userStatus;
                const progress = quest.config.configVersion === 1
                    ? status?.streamProgressSeconds
                    : Math.floor(status?.progress?.[task]?.value ?? 0);
                console.log(`[AutoQuest] progress: ${progress}/${needed}`);
                if (progress >= needed) done();
            };
            const poll = setInterval(() => { if (stopped) done(); }, 2000);
            const timeout = setTimeout(() => {
                cleanup();
                reject(new Error("timed out waiting for heartbeats"));
            }, (needed + 600) * 1000);
            const cleanup = () => {
                clearInterval(poll);
                clearTimeout(timeout);
                FluxDispatcher.unsubscribe("QUESTS_SEND_HEARTBEAT_SUCCESS", onHeartbeat);
            };
            const done = () => { cleanup(); resolve(); };
            FluxDispatcher.subscribe("QUESTS_SEND_HEARTBEAT_SUCCESS", onHeartbeat);
        });
    } finally {
        restore();
    }
}

function getUnclaimedQuests(): any[] {
    return [...QuestsStore.quests.values()].filter((q: any) =>
        q.userStatus?.completedAt && !q.userStatus?.claimedAt && !claimAttempted.has(q.id)
    );
}

async function claimReward(quest: any) {
    claimAttempted.add(quest.id);
    const name = quest.config?.messages?.questName ?? "quest";

    try {
        await RestAPI.post({
            url: `/quests/${quest.id}/claim-reward`,
            body: {
                location: 11, // QUEST_HOME_DESKTOP
                platform: 0,
                metadata_sealed: quest.metadataSealed ?? null,
                traffic_metadata_sealed: quest.trafficMetadataSealed ?? null
            }
        });
        toast(`Auto Quest: reward for "${name}" claimed.`, Toasts.Type.SUCCESS);
    } catch (err: any) {
        const body = err?.body;
        console.warn("[AutoQuest] could not auto-claim", quest.id, err?.status, JSON.stringify(body));
        if (body?.captcha_key) toast(`Auto Quest: "${name}" needs a captcha, claim it in the Quests tab.`);
        else toast(`Auto Quest: could not auto-claim "${name}", claim it in the Quests tab.`, Toasts.Type.FAILURE);
    }
}

async function claimPending() {
    if (!settings.store.autoClaim) return;
    for (const quest of getUnclaimedQuests()) {
        if (stopped) return;
        await sleep(rand(4000, 15_000));
        if (stopped) return;
        await claimReward(quest);
    }
}

async function runNext() {
    if (running || stopped) return;

    const quest = findPendingQuest();
    if (!quest) {
        if (!running) {
            running = true;
            try { await claimPending(); } finally { running = false; }
        }
        return;
    }

    const task = getTaskType(quest)!;
    const name = quest.config.messages?.questName ?? quest.config.application?.name ?? "quest";

    running = true;
    toast(`Auto Quest: working on "${name}"`);

    try {
        if (task === "PLAY_ON_DESKTOP") await completeDesktopGame(quest, task);
        else if (task === "PLAY_ACTIVITY") await completeActivity(quest, task);
        else await completeVideo(quest, task);

        if (!stopped) {
            toast(`Auto Quest: "${name}" completed.`, Toasts.Type.SUCCESS);
            if (settings.store.autoClaim) {
                await sleep(rand(4000, 15_000));
                const fresh = [...QuestsStore.quests.values()].find((q: any) => q.id === quest.id) ?? quest;
                if (!stopped && !fresh.userStatus?.claimedAt && !claimAttempted.has(fresh.id)) await claimReward(fresh);
            }
        }
    } catch (err) {
        failedQuests.add(quest.id);
        console.error("[AutoQuest] failed on quest", quest.id, err);
        toast(`Auto Quest: "${name}" failed (see console)`, Toasts.Type.FAILURE);
    } finally {
        running = false;
    }

    // Chain into the next accepted quest, if any, after a human-ish pause
    // rather than instantly.
    if (!stopped) setTimeout(runNext, rand(3000, 9000));
}

export default definePlugin({
    name: "AutoQuest",
    authors: [Devs.Tsar],
    description: "Automatically completes accepted Discord Quests (play a game, watch a video, play an activity) in the background just by having Discord open. Accept the quest first. Rewards are claimed automatically when possible (captcha-protected ones are left for you).",
    tags: ["Utility"],
    settings,

    start() {
        stopped = false;
        setTimeout(runNext, rand(15_000, 45_000));
        const scheduleCheck = () => {
            if (stopped) return;
            const baseMs = Math.max(1, settings.store.checkMinutes) * 60_000;
            checkTimer = setTimeout(() => { runNext(); scheduleCheck(); }, rand(baseMs * 0.7, baseMs * 1.3));
        };
        scheduleCheck();
    },

    stop() {
        stopped = true;
        clearTimeout(checkTimer);
        checkTimer = undefined;
        failedQuests.clear();
        claimAttempted.clear();
    }
});
