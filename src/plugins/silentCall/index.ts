/*
 * Vencord, a Discord client mod
 * Copyright (c) 2026 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { Devs } from "@utils/constants";
import definePlugin from "@utils/types";
import { RestAPI } from "@webpack/common";

// Discord starts a call and then asks the server to ring the other side with this request.
const RING_URL = /^\/channels\/\d+\/call\/ring$/;

type Post = typeof RestAPI.post;
let original: Post | undefined;

export default definePlugin({
    name: "SilentCall",
    authors: [Devs.Tsar],
    description: "Starts and joins direct message and group calls without ringing anyone. The other people see that a call is going on and can join from the chat, their phones just do not ring. While the plugin is on, you cannot ring people on purpose.",
    tags: ["Voice", "Privacy"],

    start() {
        original = RestAPI.post;
        const wrapped = function (this: unknown, request: Parameters<Post>[0]) {
            if (typeof request?.url === "string" && RING_URL.test(request.url)) {
                return Promise.resolve({ ok: true, status: 204, headers: {}, body: null });
            }
            return original!.call(RestAPI, request);
        };
        RestAPI.post = wrapped as unknown as Post;
    },

    stop() {
        if (original) RestAPI.post = original;
        original = undefined;
    }
});
