/*
 * Vencord, a Discord client mod
 * Copyright (c) 2026 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { Logger } from "@utils/Logger";
import { Alerts, Toasts } from "@webpack/common";

const logger = new Logger("BotClient");

// Toasts.show can fail to resolve after Discord updates; fall back to an alert so errors stay visible
export function showToast({ text, variant = "default" }: { text: string; variant?: string; position?: string; }) {
    logger.log(`[${variant}] ${text}`);
    try {
        const type = variant === "critical" ? Toasts.Type.FAILURE : variant === "success" ? Toasts.Type.SUCCESS : Toasts.Type.MESSAGE;
        Toasts.show({ message: text, type, id: Toasts.genId() });
    } catch {
        if (variant === "critical") Alerts.show({ title: "BotClient", body: text });
    }
}
