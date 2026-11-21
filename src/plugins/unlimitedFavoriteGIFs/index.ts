/*
 * Vencord, a Discord client mod
 * Copyright (c) 2026 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { Devs } from "@utils/constants";
import definePlugin from "@utils/types";

export default definePlugin({
    name: "UnlimitedFavoriteGIFs",
    authors: [Devs.Tsar],
    description: "Removes the client-side size check that stops you from saving more favorite GIFs once your list is big. Discord's servers may still refuse a very large list, and then the newest GIFs may not stick.",
    tags: ["Media", "Customisation"],

    patches: [
        {
            find: "762880",
            replacement: {
                match: /(\.toBinary\(\i\)\.length>)762880/,
                replace: "$1(1/0)"
            }
        }
    ]
});
