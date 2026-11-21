/*
 * Vencord, a Discord client mod
 * Copyright (c) 2026 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { Devs } from "@utils/constants";
import { t } from "@utils/i18n";
import definePlugin from "@utils/types";
import { MessageStore, RestAPI, SelectedChannelStore, showToast, Toasts, UserStore } from "@webpack/common";

// Normal messages and replies. System messages cannot be deleted by their author.
const DELETABLE_TYPES = new Set([0, 19]);

async function onKeydown(e: KeyboardEvent) {
    if (!(e.ctrlKey && e.shiftKey && e.key === "Backspace")) return;
    // Do not eat the shortcut while the user is typing somewhere else than the chat box.
    const target = e.target as HTMLElement | null;
    if (target?.closest("input, textarea:not([role=textbox])")) return;

    const channelId = SelectedChannelStore.getChannelId();
    const myId = UserStore.getCurrentUser()?.id;
    if (!channelId || !myId) return;

    const messages: any[] = MessageStore.getMessages(channelId)?._array ?? [];
    const last = [...messages].reverse().find(m => m.author?.id === myId && DELETABLE_TYPES.has(m.type) && !m.state);
    if (!last) return showToast(t("No message of yours to delete here."), Toasts.Type.FAILURE);

    e.preventDefault();
    try {
        await RestAPI.del({ url: `/channels/${channelId}/messages/${last.id}` });
        showToast(t("Deleted your last message."), Toasts.Type.SUCCESS);
    } catch (err) {
        console.error("[QuickDelete] delete failed", err);
        showToast(t("Could not delete the message."), Toasts.Type.FAILURE);
    }
}

export default definePlugin({
    name: "QuickDelete",
    authors: [Devs.Tsar],
    description: "Press Ctrl+Shift+Backspace to delete your last message in the open channel, without reaching for the mouse.",
    tags: ["Chat", "Shortcuts"],

    start() {
        document.addEventListener("keydown", onKeydown);
    },

    stop() {
        document.removeEventListener("keydown", onKeydown);
    }
});
