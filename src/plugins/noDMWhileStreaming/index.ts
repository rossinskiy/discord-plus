/*
 * Vencord, a Discord client mod
 * Copyright (c) 2026 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import "./style.css";

import { isOwnStream } from "@plugins/streamProof/own";
import { Devs } from "@utils/constants";
import definePlugin from "@utils/types";
import { UserStore } from "@webpack/common";

const CLASS = "vc-nodm-streaming";

export default definePlugin({
    name: "NoDMWhileStreaming",
    authors: [Devs.Tsar],
    description: "While you stream, hides the list of direct messages in the sidebar and the unread number badges, so names and counts do not show to viewers. It hides things on screen only, notification pop-ups and sounds still come through, so turn on Do Not Disturb for those.",
    tags: ["Privacy", "Appearance"],

    flux: {
        STREAM_CREATE({ streamKey }: { streamKey: string; }) {
            if (isOwnStream(streamKey, UserStore.getCurrentUser()?.id)) document.body.classList.add(CLASS);
        },
        STREAM_DELETE({ streamKey }: { streamKey: string; }) {
            if (isOwnStream(streamKey, UserStore.getCurrentUser()?.id)) document.body.classList.remove(CLASS);
        }
    },

    stop() {
        document.body.classList.remove(CLASS);
    }
});
