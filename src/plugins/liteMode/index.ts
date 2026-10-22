/*
 * Vencord, a Discord client mod
 * Copyright (c) 2026 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { isPluginEnabled } from "@api/PluginManager";
import { definePluginSettings } from "@api/Settings";
import { managedStyleRootNode } from "@api/Styles";
import { Devs } from "@utils/constants";
import { createAndAppendStyle } from "@utils/css";
import definePlugin, { OptionType } from "@utils/types";

let style: HTMLStyleElement | undefined;

function applyCss() {
    if (!style) return;

    const { reduceMotion, noBackdropBlur, releaseGpuLayers, flatShadows } = settings.store;
    const rules: string[] = [];

    if (reduceMotion) {
        // Near-zero durations instead of "none" so animationend/transitionend
        // still fire and nothing waiting on them gets stuck.
        rules.push(`*, *::before, *::after {
            animation-duration: 1ms !important;
            animation-delay: 0s !important;
            animation-iteration-count: 1 !important;
            transition-duration: 1ms !important;
            transition-delay: 0s !important;
            scroll-behavior: auto !important;
        }`);
    }

    if (noBackdropBlur) {
        rules.push(`*, *::before, *::after {
            backdrop-filter: none !important;
            -webkit-backdrop-filter: none !important;
        }`);
    }

    if (releaseGpuLayers) {
        rules.push("*, *::before, *::after { will-change: auto !important; }");
    }

    if (flatShadows) {
        rules.push(`*, *::before, *::after {
            box-shadow: none !important;
            text-shadow: none !important;
        }`);
    }

    style.textContent = rules.join("\n");
}

const settings = definePluginSettings({
    reduceMotion: {
        type: OptionType.BOOLEAN,
        description: "Cut UI animations and transitions down to nothing",
        default: true,
        onChange: applyCss
    },
    freezeAnimatedMedia: {
        type: OptionType.BOOLEAN,
        description: "Show a still image instead of animating avatars, emoji, banners, name colours and nameplates",
        default: true,
        restartNeeded: true
    },
    noBackdropBlur: {
        type: OptionType.BOOLEAN,
        description: "Turn off frosted-glass blur behind menus, popouts and overlays (a big GPU saver)",
        default: true,
        onChange: applyCss
    },
    releaseGpuLayers: {
        type: OptionType.BOOLEAN,
        description: "Stop elements from reserving their own GPU layers ahead of time (saves video memory)",
        default: true,
        onChange: applyCss
    },
    flatShadows: {
        type: OptionType.BOOLEAN,
        description: "Remove drop shadows. Saves a little more GPU time, but some focus outlines and borders go with them",
        default: false,
        onChange: applyCss
    }
});

const frozen = (predicate = () => settings.store.freezeAnimatedMedia) => ({ predicate });

export default definePlugin({
    name: "LiteMode",
    authors: [Devs.Tsar],
    description: "Makes Discord lighter on CPU, GPU and RAM and less laggy while typing: switches off animations and blur, and swaps animated avatars, emoji, banners and name effects for still images.",
    tags: ["Appearance", "Utility"],
    settings,

    // The opposite of AlwaysAnimate: the same spots, forced off instead of on.
    patches: [
        {
            find: "canAnimate:",
            all: true,
            // Some modules match the find but the replacement is returned untouched
            noWarn: true,
            ...frozen(),
            replacement: {
                match: /canAnimate:.+?([,}].*?\))/g,
                replace: (m, rest) => {
                    const destructuringMatch = rest.match(/}=.+/);
                    if (destructuringMatch == null) return `canAnimate:!1${rest}`;
                    return m;
                }
            }
        },
        {
            // Status emojis
            find: "#{intl::GUILD_OWNER}),children:",
            ...frozen(),
            replacement: {
                match: /(\.CUSTOM_STATUS.+?animateEmoji:)\i/,
                replace: "$1!1"
            }
        },
        {
            // Guild Banner
            find: "#{intl::DISCOVERABLE_GUILD_HEADER_PUBLIC_INFO}",
            ...frozen(),
            replacement: {
                match: /(guildBanner:\i,animate:)\i(?=}\):null)/,
                replace: "$1!1"
            }
        },
        {
            // Gradient roles in chat
            find: "=!1,contentOnly:",
            ...frozen(),
            replacement: {
                match: /animate:\i/,
                replace: "animate:!1"
            }
        },
        {
            // Gradient roles in member list
            find: '="left",className:',
            ...frozen(),
            replacement: {
                match: /,animateGradient:/,
                replace: ",animateGradient:!1,_oldAnimateGradient:"
            }
        },
        {
            // Nameplates
            find: ".MINI_PREVIEW,[",
            ...frozen(),
            replacement: {
                match: /animate:\i,loop:/,
                replace: "animate:false,loop:false,_loop:"
            }
        }
    ],

    start() {
        if (isPluginEnabled("AlwaysAnimate")) {
            throw new Error("LiteMode can't be enabled while AlwaysAnimate is enabled, they do opposite things to the same code. Disable AlwaysAnimate first.");
        }

        style = createAndAppendStyle("VcLiteMode", managedStyleRootNode);
        applyCss();
    },

    stop() {
        style?.remove();
        style = undefined;
    }
});
