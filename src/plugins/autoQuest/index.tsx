/*
 * Discord+, a fork of Vencord
 * Copyright (c) 2023 Vendicated and contributors
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU General Public License for more details.
 *
 * You should have received a copy of the GNU General Public License
 * along with this program.  If not, see <https://www.gnu.org/licenses/>.
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
let checkTimer: ReturnType<typeof setInterval> | undefined;
const failedQuests = new Set<string>();

const sleep = (ms: number) => new Promise<void>(r => setTimeout(r, ms));

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
    const speed = 7;
    const maxFuture = 10;
    let done = getProgress(quest, task);
    let completed = false;

    // The server rejects timestamps further ahead than real elapsed time since
    // enrolling (plus a small margin), so advance in small steps as allowed.
    while (!stopped && done < needed) {
        const maxAllowed = Math.floor((Date.now() - enrolledAt) / 1000) + maxFuture;
        if (maxAllowed - done >= speed) {
            const timestamp = Math.min(needed, done + speed);
            const res = await RestAPI.post({
                url: `/quests/${quest.id}/video-progress`,
                body: { timestamp: Math.min(needed, timestamp + Math.random()) }
            });
            completed = res.body?.completed_at != null;
            done = timestamp;
        }
        await sleep(1000);
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
        await sleep(20_000);
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
    const pid = Math.floor(Math.random() * 30000) + 1000;
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

    store.getRunningGames = () => fakeGames;
    store.getGameForPID = (p: number) => fakeGames.find(g => g.pid === p);
    FluxDispatcher.dispatch({ type: "RUNNING_GAMES_CHANGE", removed: realGames, added: [fakeGame], games: fakeGames });

    const restore = () => {
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

async function runNext() {
    if (running || stopped) return;

    const quest = findPendingQuest();
    if (!quest) return;

    const task = getTaskType(quest)!;
    const name = quest.config.messages?.questName ?? quest.config.application?.name ?? "quest";

    running = true;
    toast(`Auto Quest: working on "${name}"`);

    try {
        if (task === "PLAY_ON_DESKTOP") await completeDesktopGame(quest, task);
        else if (task === "PLAY_ACTIVITY") await completeActivity(quest, task);
        else await completeVideo(quest, task);

        if (!stopped) toast(`Auto Quest: "${name}" completed. Claim the reward in the Quests tab.`, Toasts.Type.SUCCESS);
    } catch (err) {
        failedQuests.add(quest.id);
        console.error("[AutoQuest] failed on quest", quest.id, err);
        toast(`Auto Quest: "${name}" failed (see console)`, Toasts.Type.FAILURE);
    } finally {
        running = false;
    }

    // Chain straight into the next accepted quest, if any.
    if (!stopped) setTimeout(runNext, 2000);
}

export default definePlugin({
    name: "AutoQuest",
    authors: [Devs.Tsar],
    description: "Automatically completes accepted Discord Quests (play a game, watch a video, play an activity) in the background just by having Discord open. Accept the quest first; claim the reward yourself afterwards.",
    tags: ["Utility"],
    settings,

    start() {
        stopped = false;
        setTimeout(runNext, 15_000);
        checkTimer = setInterval(runNext, Math.max(1, settings.store.checkMinutes) * 60_000);
    },

    stop() {
        stopped = true;
        clearInterval(checkTimer);
        checkTimer = undefined;
        failedQuests.clear();
    }
});
