/*
 * Vencord, a Discord client mod
 * Copyright (c) 2026 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { Devs } from "@utils/constants";
import { t } from "@utils/i18n";
import definePlugin from "@utils/types";

import { hasRickroll } from "./detect";

export default definePlugin({
    name: "AntiRickroll",
    authors: [Devs.Tsar],
    description: "Adds a small warning under messages that link to the famous rickroll video, so you do not click it by surprise. It only knows the original video, not copies or links hidden behind link shorteners.",
    tags: ["Chat", "Fun"],

    renderMessageAccessory({ message }) {
        if (!hasRickroll(message.content ?? "")) return null;
        return (
            <div style={{ fontSize: "12px", color: "var(--text-warning, #faa61a)", marginTop: "2px" }}>
                {t("This link goes to the rickroll video.")}
            </div>
        );
    }
});
