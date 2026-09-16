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

import { NavContextMenuPatchCallback } from "@api/ContextMenu";
import { ClockIcon } from "@components/Icons";
import { Devs } from "@utils/constants";
import definePlugin from "@utils/types";
import type { User } from "@vencord/discord-types";
import { Menu, PresenceStore, UserStore } from "@webpack/common";

import { PresenceEvent, sendPresenceEvents } from "./api";
import { openLastSeenModal } from "./LastSeenModal";
import { settings } from "./settings";

const ONLINE_STATUSES = new Set(["online", "idle", "dnd", "streaming"]);

// Our own view of each user's last known status, independent of PresenceStore's internal
// timing, so we can detect the exact moment someone crosses the online <-> offline boundary.
const knownStatuses = new Map<string, string>();

let debounceTimer: ReturnType<typeof setTimeout> | undefined;

function checkTransitions() {
    const { statuses } = PresenceStore.getState();

    for (const [userId, status] of Object.entries(statuses)) {
        const prev = knownStatuses.get(userId);
        const isOnlineNow = ONLINE_STATUSES.has(status as string);
        const wasOnline = prev !== undefined && ONLINE_STATUSES.has(prev);

        // Only log the moment they leave an online-ish state — that's what "last seen" means.
        // This also naturally captures brief online -> offline -> online -> offline blips,
        // since each crossing is its own event.
        if (wasOnline && !isOnlineNow) {
            sendPresenceEvents([{
                userId,
                reason: "presence",
                status: prev,
                timestamp: Date.now()
            }]);
        }

        knownStatuses.set(userId, status as string);
    }
}

function onPresenceStoreChange() {
    clearTimeout(debounceTimer);
    debounceTimer = setTimeout(checkTransitions, 300);
}

const HistoryMenuItem: NavContextMenuPatchCallback = (children, { user }: { user: User; }) => {
    if (!user) return;

    children.push(
        <Menu.MenuItem
            id="vc-last-seen"
            label="Last Seen"
            action={() => openLastSeenModal(user.id)}
            icon={ClockIcon}
            leadingAccessory={{ type: "icon", icon: ClockIcon }}
        />
    );
};

export default definePlugin({
    name: "LastSeen",
    authors: [Devs.Tsar],
    description: "Remembers when a user was last seen online (based on presence changes and messages you've observed) and what caused that reading. Not real read receipts — Discord doesn't expose that to any client.",
    tags: ["Utility"],
    settings,
    contextMenus: {
        "user-context": HistoryMenuItem
    },

    start() {
        // Seed our baseline from whatever PresenceStore already knows, so we don't
        // fire false "just went offline" events for users who were already offline.
        const { statuses } = PresenceStore.getState();
        for (const [userId, status] of Object.entries(statuses)) {
            knownStatuses.set(userId, status as string);
        }

        PresenceStore.addChangeListener(onPresenceStoreChange);
    },

    stop() {
        PresenceStore.removeChangeListener(onPresenceStoreChange);
        clearTimeout(debounceTimer);
        knownStatuses.clear();
    },

    flux: {
        MESSAGE_CREATE({ message }: { message: any; }) {
            const myId = UserStore.getCurrentUser()?.id;
            if (!message?.author?.id || message.author.id === myId || message.author.bot) return;

            const event: PresenceEvent = {
                userId: message.author.id,
                reason: "message",
                channelId: message.channel_id,
                timestamp: Date.now()
            };
            sendPresenceEvents([event]);
        }
    }
});
