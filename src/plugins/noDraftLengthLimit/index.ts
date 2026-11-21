/*
 * Vencord, a Discord client mod
 * Copyright (c) 2026 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { Devs } from "@utils/constants";
import definePlugin from "@utils/types";

export default definePlugin({
    name: "NoDraftLengthLimit",
    authors: [Devs.Tsar],
    description: "Discord cuts the saved draft of an unsent message to 4500 characters, so a very long text is trimmed after you switch channels or restart. This keeps the whole draft.",
    tags: ["Chat", "Utility"],

    patches: [
        {
            find: "substr(0,4500)",
            replacement: {
                match: /\((\i)=(\i)\)\.length>4500&&\(\1=\1\.substr\(0,4500\)\),/,
                replace: "($1=$2),"
            }
        }
    ]
});
