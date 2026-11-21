/*
 * Vencord, a Discord client mod
 * Copyright (c) 2026 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { ApplicationCommandInputType, ApplicationCommandOptionType, findOption, sendBotMessage } from "@api/Commands";
import { findGroupChildrenByChildId, NavContextMenuPatchCallback } from "@api/ContextMenu";
import * as DataStore from "@api/DataStore";
import { Devs } from "@utils/constants";
import { t } from "@utils/i18n";
import definePlugin from "@utils/types";
import type { Message } from "@vencord/discord-types";
import { ChannelStore, Menu, showToast, Toasts } from "@webpack/common";

import { add, Bookmark, excerpt, has, messageLink, remove } from "./list";

const STORE_KEY = "Bookmarks_data";
const SHOWN = 15;

let items: Bookmark[] = [];

const save = () => DataStore.set(STORE_KEY, items);

const messageCtxPatch: NavContextMenuPatchCallback = (children, { message }: { message: Message; }) => {
    if (!message?.id) return;
    const group = findGroupChildrenByChildId("copy-text", children) ?? findGroupChildrenByChildId("copy-link", children);
    if (!group) return;

    const saved = has(items, message.id);
    group.push(
        <Menu.MenuItem
            id="vc-bookmark"
            label={saved ? t("Remove bookmark") : t("Bookmark message")}
            action={() => {
                if (saved) {
                    items = remove(items, message.id);
                    showToast(t("Bookmark removed."), Toasts.Type.SUCCESS);
                } else {
                    const channel = ChannelStore.getChannel(message.channel_id);
                    items = add(items, {
                        messageId: message.id,
                        channelId: message.channel_id,
                        guildId: channel?.guild_id ?? null,
                        author: message.author?.username ?? "?",
                        text: excerpt(message.content || t("(attachment)")),
                        savedAt: Date.now()
                    });
                    showToast(t("Message bookmarked. See them with /bookmarks."), Toasts.Type.SUCCESS);
                }
                save();
            }}
        />
    );
};

export default definePlugin({
    name: "Bookmarks",
    authors: [Devs.Tsar],
    description: "Right-click a message and bookmark it, then see all your bookmarks with /bookmarks and jump back to them. Bookmarks are kept on your computer, up to 200.",
    tags: ["Chat", "Organisation"],

    contextMenus: {
        "message": messageCtxPatch
    },

    async start() {
        items = await DataStore.get<Bookmark[]>(STORE_KEY) ?? [];
    },

    commands: [{
        name: "bookmarks",
        description: t("List your bookmarked messages, or remove one by its number"),
        inputType: ApplicationCommandInputType.BUILT_IN,
        options: [
            { name: "remove", description: t("Number from the list to remove"), type: ApplicationCommandOptionType.INTEGER, required: false }
        ],
        execute(args, ctx) {
            const number: number = findOption(args, "remove", 0);
            if (number) {
                const target = items[number - 1];
                if (!target) return sendBotMessage(ctx.channel.id, { content: t("There is no bookmark number {n}.", { n: number }) });
                items = remove(items, target.messageId);
                save();
                return sendBotMessage(ctx.channel.id, { content: t("Removed: {text}", { text: target.text }) });
            }
            if (!items.length) return sendBotMessage(ctx.channel.id, { content: t("No bookmarks yet. Right-click a message and choose Bookmark message.") });

            const lines = items.slice(0, SHOWN).map((b, i) => `${i + 1}. ${b.author}: ${b.text}\n${messageLink(b)}`);
            const more = items.length > SHOWN ? "\n" + t("and {n} more", { n: items.length - SHOWN }) : "";
            sendBotMessage(ctx.channel.id, { content: lines.join("\n") + more + "\n\n" + t("Remove one with `/bookmarks remove:<number>`.") });
        }
    }]
});
