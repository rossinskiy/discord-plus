/*
 * Vencord, a Discord client mod
 * Copyright (c) 2026 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import "./style.css";

import { Devs } from "@utils/constants";
import definePlugin from "@utils/types";

export default definePlugin({
    name: "SmoothMessages",
    authors: [Devs.Tsar],
    description: "New messages slide in gently from the left instead of popping into the chat. Turns itself off if your system asks for reduced motion.",
    tags: ["Appearance", "Fun"]
});
