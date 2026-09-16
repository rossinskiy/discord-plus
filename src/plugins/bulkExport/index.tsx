/*
 * Discord+, a fork of Vencord
 * Copyright (c) 2023 Vendicated and contributors
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU General Public License for more details.
 *
 * You should have received a copy of the GNU General Public License
 * along with this program.  If not, see <https://www.gnu.org/licenses/>.
*/

import { findGroupChildrenByChildId, NavContextMenuPatchCallback } from "@api/ContextMenu";
import { Devs } from "@utils/constants";
import definePlugin from "@utils/types";
import { saveFile } from "@utils/web";
import type { Channel } from "@vencord/discord-types";
import { ChannelStore, Menu, RestAPI, showToast, Toasts, UserStore } from "@webpack/common";

const PAGE_SIZE = 100;
let exporting = false;

function getExportName(channel: Channel) {
    if (channel.name) return channel.name;
    if (channel.recipients?.length === 1) {
        return UserStore.getUser(channel.recipients[0])?.username ?? channel.recipients[0];
    }
    if (channel.recipients?.length) {
        return channel.recipients.map(id => UserStore.getUser(id)?.username ?? id).join(", ");
    }
    return channel.id;
}

function formatMessage(msg: any) {
    return {
        id: msg.id,
        authorId: msg.author?.id,
        author: msg.author?.username,
        timestamp: msg.timestamp,
        editedTimestamp: msg.edited_timestamp,
        content: msg.content,
        attachments: (msg.attachments ?? []).map((a: any) => ({ filename: a.filename, url: a.url, size: a.size })),
        embeds: (msg.embeds ?? []).length,
        reactions: (msg.reactions ?? []).map((r: any) => ({ emoji: r.emoji?.name, count: r.count }))
    };
}

async function exportChannel(channel: Channel) {
    if (exporting) {
        showToast("An export is already in progress.", Toasts.Type.FAILURE);
        return;
    }

    exporting = true;
    const toastId = Toasts.genId();
    Toasts.show({ id: toastId, type: Toasts.Type.MESSAGE, message: "Starting export..." });

    // The toast UI has a minimum display duration per update, so calling Toasts.show()
    // on every page (which can complete many times a second) queues up a huge backlog
    // that trickles out slower than the real fetch progress. Poll on a fixed interval instead.
    const progress = { count: 0 };
    const progressInterval = setInterval(() => {
        Toasts.show({
            id: toastId,
            type: Toasts.Type.MESSAGE,
            message: `Exporting... ${progress.count} messages fetched`
        });
    }, 500);

    try {
        const messages: any[] = [];
        let before: string | undefined;

        while (true) {
            const { body } = await RestAPI.get({
                url: `/channels/${channel.id}/messages`,
                query: { limit: PAGE_SIZE, ...(before ? { before } : {}) }
            });

            if (!body?.length) break;

            messages.push(...body);
            before = body[body.length - 1].id;
            progress.count = messages.length;

            if (body.length < PAGE_SIZE) break;
        }

        messages.reverse(); // oldest first

        const exportData = {
            channelId: channel.id,
            channelName: getExportName(channel),
            exportedAt: new Date().toISOString(),
            messageCount: messages.length,
            messages: messages.map(formatMessage)
        };

        const json = JSON.stringify(exportData, null, 2);
        const filename = `${getExportName(channel).replace(/[^a-z0-9-_]+/gi, "_")}_${channel.id}_export.json`;
        saveFile(new File([json], filename, { type: "application/json" }));

        showToast(`Exported ${messages.length} messages.`, Toasts.Type.SUCCESS);
    } catch (e) {
        showToast("Export failed: " + (e as Error).message, Toasts.Type.FAILURE);
    } finally {
        clearInterval(progressInterval);
        exporting = false;
    }
}

const ExportMenuItem: NavContextMenuPatchCallback = (children, { channel }: { channel: Channel; }) => {
    if (!channel) return;

    const group = findGroupChildrenByChildId("mark-channel-read", children) ?? children;
    group.push(
        <Menu.MenuItem
            id="vc-bulk-export"
            label="Export Messages"
            action={() => exportChannel(channel)}
        />
    );
};

export default definePlugin({
    name: "BulkExport",
    authors: [Devs.Tsar],
    description: "Exports a channel or DM's full message history to a JSON file.",
    tags: ["Chat", "Utility"],
    contextMenus: {
        "channel-context": ExportMenuItem,
        "thread-context": ExportMenuItem,
        "user-context": ExportMenuItem,
        "gdm-context": ExportMenuItem
    }
});
