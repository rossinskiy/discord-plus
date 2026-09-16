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
import { Menu } from "@webpack/common";

import { sendNameEvents } from "./api";
import { openNameHistoryModal } from "./HistoryModal";
import { settings } from "./settings";

// Local baseline caches so we only ever compare against values *we've* previously observed
// (avoids logging a false "change" the first time we ever see a user)
const knownUsernames = new Map<string, string>();
const knownGlobalNames = new Map<string, string | null>();
const knownNicknames = new Map<string, string | null>(); // key: `${guildId}:${userId}`

const HistoryMenuItem: NavContextMenuPatchCallback = (children, { user }: { user: User; }) => {
    if (!user) return;

    children.push(
        <Menu.MenuItem
            id="vc-name-history"
            label="View Name History"
            action={() => openNameHistoryModal(user.id)}
            icon={ClockIcon}
            leadingAccessory={{ type: "icon", icon: ClockIcon }}
        />
    );
};

export default definePlugin({
    name: "NicknameHistory",
    authors: [Devs.Tsar],
    description: "Tracks username, display name, and per-server nickname changes over time, persisted to your own server.",
    tags: ["Utility"],
    settings,
    contextMenus: {
        "user-context": HistoryMenuItem
    },

    flux: {
        USER_UPDATE({ user }: { user: any; }) {
            if (!user?.id || !settings.store.trackUsernames) return;

            const prevUsername = knownUsernames.get(user.id);
            const prevGlobalName = knownGlobalNames.get(user.id);

            const events: any[] = [];

            if (prevUsername !== undefined && user.username && prevUsername !== user.username) {
                events.push({
                    userId: user.id,
                    guildId: null,
                    field: "username",
                    oldValue: prevUsername,
                    newValue: user.username,
                    timestamp: Date.now()
                });
            }

            if (prevGlobalName !== undefined && prevGlobalName !== (user.global_name ?? null)) {
                events.push({
                    userId: user.id,
                    guildId: null,
                    field: "globalName",
                    oldValue: prevGlobalName,
                    newValue: user.global_name ?? null,
                    timestamp: Date.now()
                });
            }

            if (user.username) knownUsernames.set(user.id, user.username);
            knownGlobalNames.set(user.id, user.global_name ?? null);

            if (events.length) sendNameEvents(events);
        },

        GUILD_MEMBER_UPDATE({ guildId, user, nick }: { guildId: string; user: any; nick?: string | null; }) {
            if (!user?.id || !settings.store.trackNicknames) return;

            const key = `${guildId}:${user.id}`;
            const prevNick = knownNicknames.get(key);
            const newNick = nick ?? null;

            if (prevNick !== undefined && prevNick !== newNick) {
                sendNameEvents([{
                    userId: user.id,
                    guildId,
                    field: "nickname",
                    oldValue: prevNick,
                    newValue: newNick,
                    timestamp: Date.now()
                }]);
            }

            knownNicknames.set(key, newNick);
        }
    }
});
