/*
 * Vencord, a Discord client mod
 * Copyright (c) 2026 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { sendBotMessage } from "@api/Commands";
import { findGroupChildrenByChildId, NavContextMenuPatchCallback } from "@api/ContextMenu";
import { Devs } from "@utils/constants";
import { t } from "@utils/i18n";
import definePlugin from "@utils/types";
import type { Message, MessageAttachment } from "@vencord/discord-types";
import { Menu, SelectedChannelStore, showToast, Toasts } from "@webpack/common";
import { unzipSync } from "fflate";

import { describeZip, formatSize, ZipEntry } from "./summary";

const MAX_BYTES = 100 * 1024 * 1024;

const isZip = (a: MessageAttachment) => a.content_type === "application/zip" || /\.zip$/i.test(a.filename);

async function preview(file: MessageAttachment) {
    const channelId = SelectedChannelStore.getChannelId();
    if (file.size > MAX_BYTES) return sendBotMessage(channelId, { content: t("{name} is too big to open here.", { name: file.filename }) });
    try {
        const res = await fetch(file.url);
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const entries: ZipEntry[] = [];
        // The filter sees every entry and returns false, so nothing is ever unpacked, only the names and sizes are read.
        unzipSync(new Uint8Array(await res.arrayBuffer()), {
            filter: f => {
                entries.push({ name: f.name, size: f.originalSize });
                return false;
            }
        });

        const info = describeZip(entries);
        const head = t("{name}: {files} files, {size} when unpacked.", { name: file.filename, files: info.files, size: formatSize(info.total) });
        const warn = info.risky ? "\n" + t("Warning: {n} entries have paths that point outside the folder. Do not unpack this archive.", { n: info.risky }) : "";
        const more = info.files > info.lines.length ? "\n" + t("and {n} more", { n: info.files - info.lines.length }) : "";
        sendBotMessage(channelId, { content: head + warn + "\n" + info.lines.join("\n") + more });
    } catch (err) {
        console.error("[ZipPreview] failed", err);
        showToast(t("Could not read the archive."), Toasts.Type.FAILURE);
    }
}

const messageCtxPatch: NavContextMenuPatchCallback = (children, { message }: { message: Message; }) => {
    const zips = (message?.attachments ?? []).filter(isZip);
    if (!zips.length) return;
    const group = findGroupChildrenByChildId("copy-text", children) ?? findGroupChildrenByChildId("copy-link", children);
    if (!group) return;

    group.push(
        zips.length === 1
            ? <Menu.MenuItem id="vc-zip-preview" label={t("Look inside archive")} action={() => preview(zips[0])} />
            : <Menu.MenuItem id="vc-zip-preview" label={t("Look inside archive")}>
                {zips.map((f, i) => <Menu.MenuItem key={f.id} id={`vc-zip-preview-${i}`} label={f.filename} action={() => preview(f)} />)}
            </Menu.MenuItem>
    );
};

export default definePlugin({
    name: "ZipPreview",
    authors: [Devs.Tsar],
    description: "Right-click a message with a .zip file and look inside it without unpacking: file names and sizes, and a warning if the archive holds paths that would escape the folder. Nothing is extracted or run.",
    tags: ["Media", "Privacy"],

    contextMenus: {
        "message": messageCtxPatch
    }
});
