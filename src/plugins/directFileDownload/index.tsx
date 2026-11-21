/*
 * Vencord, a Discord client mod
 * Copyright (c) 2026 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { findGroupChildrenByChildId, NavContextMenuPatchCallback } from "@api/ContextMenu";
import { Devs } from "@utils/constants";
import { t } from "@utils/i18n";
import definePlugin from "@utils/types";
import type { Message, MessageAttachment } from "@vencord/discord-types";
import { Menu, showToast, Toasts } from "@webpack/common";

import { safeFilename } from "./filename";

async function download(file: MessageAttachment) {
    try {
        const res = await fetch(file.url);
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const blobUrl = URL.createObjectURL(await res.blob());
        const a = document.createElement("a");
        a.href = blobUrl;
        a.download = safeFilename(file.filename);
        document.body.appendChild(a);
        a.click();
        a.remove();
        setTimeout(() => URL.revokeObjectURL(blobUrl), 10_000);
    } catch (err) {
        console.error("[DirectFileDownload] failed", err);
        showToast(t("Could not download the file."), Toasts.Type.FAILURE);
    }
}

const messageCtxPatch: NavContextMenuPatchCallback = (children, { message }: { message: Message; }) => {
    const files = message?.attachments ?? [];
    if (!files.length) return;
    const group = findGroupChildrenByChildId("copy-text", children) ?? findGroupChildrenByChildId("copy-link", children);
    if (!group) return;

    group.push(
        files.length === 1
            ? <Menu.MenuItem id="vc-direct-download" label={t("Download attachment")} action={() => download(files[0])} />
            : <Menu.MenuItem id="vc-direct-download" label={t("Download attachment")}>
                {files.map((f, i) => (
                    <Menu.MenuItem key={f.id} id={`vc-direct-download-${i}`} label={f.filename} action={() => download(f)} />
                ))}
            </Menu.MenuItem>
    );
};

export default definePlugin({
    name: "DirectFileDownload",
    authors: [Devs.Tsar],
    description: "Adds \"Download attachment\" to the right-click menu of a message with files, so the file saves straight to your downloads instead of opening in a browser tab first.",
    tags: ["Chat", "Media"],

    contextMenus: {
        "message": messageCtxPatch
    }
});
