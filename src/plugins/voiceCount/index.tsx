/*
 * Vencord, a Discord client mod
 * Copyright (c) 2026 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { Devs } from "@utils/constants";
import definePlugin from "@utils/types";
import type { Channel } from "@vencord/discord-types";

export default definePlugin({
    name: "VoiceCount",
    authors: [Devs.Tsar],
    description: "Shows how many people are in each voice channel, as a number at the right of the channel name in the channel list. Channels that already show a count because of a user limit keep Discord's own display.",
    tags: ["Voice", "Appearance"],

    patches: [
        {
            // The small function that picks what to show at the right of a channel name. At its end, before it
            // falls back to the user limit display, add our own number for voice channels that have people in them.
            find: "enableConnectedUserLimit:",
            replacement: {
                match: /(function \i\(\i\)\{let\{channel:(\i),isChannelSelected:\i,isChannelCollapsed:\i,voiceStates:\i,enableConnectedUserLimit:(\i).+?let (\i)=\i\?\.length\?\?0;)return null!=\3&&\3&&(\i)\?/,
                replace: "$1if($4>0&&$self.wantsCount($2,null!=$3&&$3&&$5))return $self.CountBadge($4);return null!=$3&&$3&&$5?"
            }
        }
    ],

    wantsCount(channel: Channel, discordShowsLimit: boolean) {
        return !discordShowsLimit && !!channel?.isGuildVocal?.();
    },

    CountBadge(count: number) {
        return (
            <span style={{ fontSize: "12px", fontWeight: 600, color: "var(--text-muted)", marginRight: 4 }}>
                {count}
            </span>
        );
    }
});
