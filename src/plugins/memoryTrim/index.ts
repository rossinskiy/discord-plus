/*
 * Vencord, a Discord client mod
 * Copyright (c) 2026 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { ApplicationCommandInputType, sendBotMessage } from "@api/Commands";
import * as DataStore from "@api/DataStore";
import { definePluginSettings } from "@api/Settings";
import { Devs } from "@utils/constants";
import { t } from "@utils/i18n";
import definePlugin, { OptionType } from "@utils/types";
import { SelectedChannelStore } from "@webpack/common";

import { reloadReason, TrimSettings } from "./decide";

const LAST_RELOAD_KEY = "MemoryTrim_lastReload";
const CHECK_MS = 60_000;

const settings = definePluginSettings({
    heapLimitMB: {
        type: OptionType.NUMBER,
        description: t("Reload when the page uses more than this many MB of memory (0 turns this off). Use /memory to see your number."),
        default: 600
    },
    maxHours: {
        type: OptionType.NUMBER,
        description: t("Reload when the page has been running this many hours (0 turns this off)"),
        default: 6
    },
    idleMinutes: {
        type: OptionType.NUMBER,
        description: t("Only reload after the Discord window has been out of focus this many minutes"),
        default: 5
    }
});

let timer: ReturnType<typeof setInterval> | undefined;
let unfocusedSince: number | null = null;
let lastReload = 0;

const heapMB = (): number | null => {
    const used = (performance as any).memory?.usedJSHeapSize;
    return typeof used === "number" ? Math.round(used / 1048576) : null;
};

const unfocusedMs = () => (unfocusedSince == null ? 0 : Date.now() - unfocusedSince);

const trimSettings = (): TrimSettings => ({
    heapLimitMB: Number(settings.store.heapLimitMB) || 0,
    maxHours: Number(settings.store.maxHours) || 0,
    idleMinutes: Number(settings.store.idleMinutes) || 5
});

function check() {
    const reason = reloadReason({
        heapMB: heapMB(),
        pageUptimeMs: performance.now(),
        unfocusedMs: unfocusedMs(),
        inVoice: !!SelectedChannelStore.getVoiceChannelId(),
        sinceLastReloadMs: lastReload ? Date.now() - lastReload : Infinity
    }, trimSettings());
    if (!reason) return;

    console.info(`[MemoryTrim] reloading the page (${reason})`);
    DataStore.set(LAST_RELOAD_KEY, Date.now()).finally(() => location.reload());
}

const onBlur = () => { unfocusedSince ??= Date.now(); };
const onFocus = () => { unfocusedSince = null; };

export default definePlugin({
    name: "MemoryTrim",
    authors: [Devs.Tsar],
    description: "Discord's page keeps growing in memory the longer it runs. This reloads it for you (the same as pressing Ctrl+R) when it gets too big or too old, but only while the window is out of focus and you are not in a voice call or stream. Your chats, drafts and settings stay as they are. Run /memory to see the numbers.",
    tags: ["Utility"],
    settings,

    async start() {
        lastReload = await DataStore.get<number>(LAST_RELOAD_KEY) ?? 0;
        unfocusedSince = document.hasFocus() ? null : Date.now();
        window.addEventListener("blur", onBlur);
        window.addEventListener("focus", onFocus);
        timer = setInterval(check, CHECK_MS);
    },

    stop() {
        clearInterval(timer);
        timer = undefined;
        window.removeEventListener("blur", onBlur);
        window.removeEventListener("focus", onFocus);
    },

    commands: [{
        name: "memory",
        description: t("Show how much memory Discord's page uses and when it will be reloaded"),
        inputType: ApplicationCommandInputType.BUILT_IN,
        execute(_, ctx) {
            const heap = heapMB();
            const cfg = trimSettings();
            const hours = (performance.now() / 3_600_000).toFixed(1);
            const lines = [
                heap == null ? t("Memory use: not available on this Discord.") : t("Memory use of the page: {n} MB (reload limit {limit} MB)", { n: heap, limit: cfg.heapLimitMB || t("off") }),
                t("The page has been running for {h} hours (reload limit {limit} hours)", { h: hours, limit: cfg.maxHours || t("off") }),
                t("It reloads by itself only when the window has been out of focus for {m} minutes and you are not in a call.", { m: cfg.idleMinutes })
            ];
            sendBotMessage(ctx.channel.id, { content: lines.join("\n") });
        }
    }]
});
