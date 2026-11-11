/*
 * Vencord, a Discord client mod
 * Copyright (c) 2026 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { Toasts } from "@webpack/common";

// The upstream plugin targets a newer showToast({ text, variant }) API; Discord+ uses Toasts.show
export function showToast({ text, variant = "default" }: { text: string; variant?: string; position?: string; }) {
    const type = variant === "critical" ? Toasts.Type.FAILURE : variant === "success" ? Toasts.Type.SUCCESS : Toasts.Type.MESSAGE;
    Toasts.show({ message: text, type, id: Toasts.genId() });
}
