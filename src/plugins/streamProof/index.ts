/*
 * Vencord, a Discord client mod
 * Copyright (c) 2026 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import "./style.css";

import { definePluginSettings } from "@api/Settings";
import { Devs } from "@utils/constants";
import { t } from "@utils/i18n";
import definePlugin, { OptionType } from "@utils/types";
import { ChannelStore, SelectedChannelStore, UserStore } from "@webpack/common";

import { isOwnStream } from "./own";

const settings = definePluginSettings({
    blurDMs: {
        type: OptionType.BOOLEAN,
        description: t("While you stream, blur the messages of direct messages and group chats"),
        default: true
    },
    blurMedia: {
        type: OptionType.BOOLEAN,
        description: t("While you stream, blur links, images and embeds in every chat (hover an image to see it)"),
        default: true
    }
});

let streaming = false;

function apply() {
    const channel = ChannelStore.getChannel(SelectedChannelStore.getChannelId());
    const inPrivateChat = !!channel && (channel.isDM() || channel.isGroupDM());
    document.body.classList.toggle("vc-streamproof-dm", streaming && settings.store.blurDMs && inPrivateChat);
    document.body.classList.toggle("vc-streamproof-media", streaming && settings.store.blurMedia);
}

export default definePlugin({
    name: "StreamProof",
    authors: [Devs.Tsar],
    description: "While you stream your screen, blurs the messages in your direct messages and the links and images in chats, so private things do not show to viewers. Your voice and the stream itself are untouched. It is blur on your own screen, so it cannot hide anything from people who are already in the chat.",
    tags: ["Privacy", "Appearance"],
    settings,

    flux: {
        STREAM_CREATE({ streamKey }: { streamKey: string; }) {
            if (!isOwnStream(streamKey, UserStore.getCurrentUser()?.id)) return;
            streaming = true;
            apply();
        },
        STREAM_DELETE({ streamKey }: { streamKey: string; }) {
            if (!isOwnStream(streamKey, UserStore.getCurrentUser()?.id)) return;
            streaming = false;
            apply();
        },
        CHANNEL_SELECT() {
            apply();
        }
    },

    stop() {
        streaming = false;
        document.body.classList.remove("vc-streamproof-dm", "vc-streamproof-media");
    }
});
