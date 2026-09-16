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
import { findByPropsLazy } from "@webpack";
import { showToast, Toasts, UserStore, VoiceStateStore } from "@webpack/common";

const { selectVoiceChannel } = findByPropsLazy("selectVoiceChannel", "selectChannel");

const settings = definePluginSettings({
    delaySeconds: {
        type: OptionType.NUMBER,
        description: "How long to wait, after you become the only human left in a voice channel, before auto-disconnecting you",
        default: 30
    }
});

let leaveTimer: ReturnType<typeof setTimeout> | undefined;
let debounceTimer: ReturnType<typeof setTimeout> | undefined;

function clearLeaveTimer() {
    if (leaveTimer) {
        clearTimeout(leaveTimer);
        leaveTimer = undefined;
    }
}

function isAlone(channelId: string, myId: string): boolean {
    const states = VoiceStateStore.getVoiceStatesForChannel(channelId);
    return Object.values(states).every(state =>
        state.userId === myId || UserStore.getUser(state.userId)?.bot
    );
}

function check() {
    const myId = UserStore.getCurrentUser()?.id;
    if (!myId) return;

    const channelId = VoiceStateStore.getVoiceStateForUser(myId)?.channelId;

    if (!channelId || !isAlone(channelId, myId)) {
        clearLeaveTimer();
        return;
    }

    if (leaveTimer) return; // already counting down

    leaveTimer = setTimeout(() => {
        leaveTimer = undefined;

        // Re-verify right before actually leaving, in case someone rejoined
        // in the last tick before this fired.
        const currentChannelId = VoiceStateStore.getVoiceStateForUser(myId)?.channelId;
        if (currentChannelId && isAlone(currentChannelId, myId)) {
            selectVoiceChannel(null);
            showToast("Left voice channel — you were alone.", Toasts.Type.MESSAGE);
        }
    }, Math.max(0, settings.store.delaySeconds) * 1000);
}

function onVoiceStateChange() {
    clearTimeout(debounceTimer);
    debounceTimer = setTimeout(check, 300);
}

export default definePlugin({
    name: "AutoLeaveEmptyVC",
    authors: [Devs.Tsar],
    description: "Automatically disconnects you from a voice channel after you become the only human left in it (bots don't count).",
    tags: ["Utility", "Voice"],
    settings,

    start() {
        VoiceStateStore.addChangeListener(onVoiceStateChange);
    },

    stop() {
        VoiceStateStore.removeChangeListener(onVoiceStateChange);
        clearTimeout(debounceTimer);
        clearLeaveTimer();
    }
});
