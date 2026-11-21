/*
 * Vencord, a Discord client mod
 * Copyright (c) 2026 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { Devs } from "@utils/constants";
import definePlugin from "@utils/types";
import { ChannelStore, NavigationRouter, SelectedChannelStore } from "@webpack/common";

import { stepBack, Visit, visit } from "./mru";

// Pressing the key again within this time keeps going further back, like Alt+Tab.
const CYCLE_WINDOW_MS = 1500;

let recent: Visit[] = [];
let steps = 0;
let lastPress = 0;
let cycleTimer: ReturnType<typeof setTimeout> | undefined;
let jumping = false;

function record(channelId: string | null | undefined, guildId: string | null | undefined) {
    if (!channelId || jumping) return;
    recent = visit(recent, { channelId, guildId: guildId ?? null });
}

function onKeydown(e: KeyboardEvent) {
    if (!(e.ctrlKey && !e.shiftKey && !e.altKey && e.key === "`")) return;
    e.preventDefault();

    const now = Date.now();
    steps = now - lastPress < CYCLE_WINDOW_MS ? steps + 1 : 1;
    lastPress = now;

    const target = stepBack(recent, steps);
    if (!target) return;

    jumping = true;
    NavigationRouter.transitionToGuild(target.guildId ?? "@me", target.channelId);

    // When the key stops, the channel we ended on becomes the newest one.
    clearTimeout(cycleTimer);
    cycleTimer = setTimeout(() => {
        jumping = false;
        const now = SelectedChannelStore.getChannelId();
        record(now, ChannelStore.getChannel(now)?.guild_id);
    }, CYCLE_WINDOW_MS);
}

export default definePlugin({
    name: "RecentChannelSwitcher",
    authors: [Devs.Tsar],
    description: "Press Ctrl+` to jump back to the channel you were in before. Press it again quickly to go further back through your recent channels.",
    tags: ["Organisation", "Shortcuts"],

    flux: {
        CHANNEL_SELECT({ channelId, guildId }: { channelId: string | null; guildId: string | null; }) {
            record(channelId, guildId);
        }
    },

    start() {
        recent = [];
        const id = SelectedChannelStore.getChannelId();
        if (id) record(id, ChannelStore.getChannel(id)?.guild_id);
        document.addEventListener("keydown", onKeydown);
    },

    stop() {
        document.removeEventListener("keydown", onKeydown);
        clearTimeout(cycleTimer);
        jumping = false;
        recent = [];
    }
});
