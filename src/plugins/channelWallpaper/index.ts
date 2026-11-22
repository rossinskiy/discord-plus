/*
 * Vencord, a Discord client mod
 * Copyright (c) 2026 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { ApplicationCommandInputType, ApplicationCommandOptionType, findOption, sendBotMessage } from "@api/Commands";
import * as DataStore from "@api/DataStore";
import { definePluginSettings } from "@api/Settings";
import { Devs } from "@utils/constants";
import { t } from "@utils/i18n";
import definePlugin, { OptionType } from "@utils/types";
import { SelectedChannelStore } from "@webpack/common";

import { cleanUrl, cssUrl, setWallpaper, Wallpapers } from "./wallpapers";

const STORE_KEY = "ChannelWallpaper_data";

const settings = definePluginSettings({
    dim: {
        type: OptionType.SLIDER,
        description: t("How much to darken the picture so text stays readable"),
        markers: [0, 20, 40, 60, 80],
        default: 40,
        stickToMarkers: false,
        onChange: () => apply()
    }
});

let wallpapers: Wallpapers = {};
let style: HTMLStyleElement | undefined;

function apply() {
    if (!style) return;
    const url = wallpapers[SelectedChannelStore.getChannelId()];
    if (!url) {
        style.textContent = "";
        return;
    }
    const shade = `rgba(0, 0, 0, ${Math.min(80, Math.max(0, settings.store.dim)) / 100})`;
    style.textContent = `[class*="chatContent"] { background: linear-gradient(${shade}, ${shade}), ${cssUrl(url)} center / cover no-repeat !important; }`;
}

export default definePlugin({
    name: "ChannelWallpaper",
    authors: [Devs.Tsar],
    description: "Give any channel or chat its own background picture with /wallpaper. The picture is loaded from the web address you give, so that website can see your connection. Only https addresses work.",
    tags: ["Appearance", "Customisation"],
    settings,

    flux: {
        CHANNEL_SELECT() {
            apply();
        }
    },

    async start() {
        wallpapers = await DataStore.get<Wallpapers>(STORE_KEY) ?? {};
        style = document.createElement("style");
        style.id = "vc-channel-wallpaper";
        document.head.appendChild(style);
        apply();
    },

    stop() {
        style?.remove();
        style = undefined;
    },

    commands: [{
        name: "wallpaper",
        description: t("Set a background picture for this channel"),
        inputType: ApplicationCommandInputType.BUILT_IN,
        options: [
            { name: "url", description: t("Address of the picture (https), or \"off\" to remove it"), type: ApplicationCommandOptionType.STRING, required: true }
        ],
        execute(args, ctx) {
            const input: string = findOption(args, "url", "").trim();
            if (input.toLowerCase() === "off") {
                wallpapers = setWallpaper(wallpapers, ctx.channel.id, null);
                DataStore.set(STORE_KEY, wallpapers);
                apply();
                return sendBotMessage(ctx.channel.id, { content: t("Wallpaper removed from this channel.") });
            }
            const url = cleanUrl(input);
            if (!url) return sendBotMessage(ctx.channel.id, { content: t("That is not an https address.") });
            wallpapers = setWallpaper(wallpapers, ctx.channel.id, url);
            DataStore.set(STORE_KEY, wallpapers);
            apply();
            sendBotMessage(ctx.channel.id, { content: t("Wallpaper set for this channel. Remove it with `/wallpaper url:off`.") });
        }
    }]
});
