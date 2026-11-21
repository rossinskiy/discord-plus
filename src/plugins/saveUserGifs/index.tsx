/*
 * Vencord, a Discord client mod
 * Copyright (c) 2026 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { NavContextMenuPatchCallback } from "@api/ContextMenu";
import { Devs } from "@utils/constants";
import { t } from "@utils/i18n";
import definePlugin from "@utils/types";
import type { User } from "@vencord/discord-types";
import { findByCodeLazy } from "@webpack";
import { Menu, MessageStore, SelectedChannelStore, showToast, Toasts } from "@webpack/common";

import { collectGifs, FavoriteGif } from "./collect";

// Discord's own "add to favorite GIFs" function, found by the analytics event name inside it.
const addFavoriteGif: (gif: FavoriteGif) => void = findByCodeLazy("favoriteGifs", "GIF_FAVORITED");

const sleep = (ms: number) => new Promise(r => setTimeout(r, ms));
let busy = false;

async function saveGifsOf(userId: string) {
    if (busy) return;
    const channelId = SelectedChannelStore.getChannelId();
    const messages: any[] = MessageStore.getMessages(channelId)?._array ?? [];
    const gifs = collectGifs(messages, userId);
    if (!gifs.length) return showToast(t("No GIFs from this person in the messages loaded here."), Toasts.Type.FAILURE);

    busy = true;
    try {
        for (const gif of gifs) {
            addFavoriteGif(gif);
            // Each save rewrites your settings, so go one at a time.
            await sleep(200);
        }
        showToast(t("Saved {n} GIFs to your favorites.", { n: gifs.length }), Toasts.Type.SUCCESS);
    } catch (err) {
        console.error("[SaveUserGifs] failed", err);
        showToast(t("Could not save the GIFs."), Toasts.Type.FAILURE);
    } finally {
        busy = false;
    }
}

const userCtxPatch: NavContextMenuPatchCallback = (children, { user }: { user: User; }) => {
    if (!user) return;
    children.push(
        <Menu.MenuItem
            id="vc-save-user-gifs"
            label={t("Save their GIFs to favorites")}
            action={() => saveGifsOf(user.id)}
        />
    );
};

export default definePlugin({
    name: "SaveUserGifs",
    authors: [Devs.Tsar],
    description: "Right-click a person and save the GIFs they sent in the open channel to your favorite GIFs. It uses the messages Discord has loaded, so scroll up first to include older ones. Up to 50 at a time.",
    tags: ["Chat", "Media"],

    contextMenus: {
        "user-context": userCtxPatch
    }
});
