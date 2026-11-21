/*
 * Vencord, a Discord client mod
 * Copyright (c) 2026 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { findGroupChildrenByChildId, NavContextMenuPatchCallback } from "@api/ContextMenu";
import { Devs } from "@utils/constants";
import { copyWithToast } from "@utils/discord";
import { t } from "@utils/i18n";
import definePlugin from "@utils/types";
import type { Message } from "@vencord/discord-types";
import { Menu } from "@webpack/common";

const messageCtxPatch: NavContextMenuPatchCallback = (children, { message }: { message: Message; }) => {
    const files = message?.attachments ?? [];
    if (!files.length) return;
    const group = findGroupChildrenByChildId("copy-text", children) ?? findGroupChildrenByChildId("copy-link", children);
    if (!group) return;

    group.push(
        files.length === 1
            ? <Menu.MenuItem
                id="vc-copy-media-link"
                label={t("Copy attachment link")}
                action={() => copyWithToast(files[0].url, t("Link copied!"))}
            />
            : <Menu.MenuItem id="vc-copy-media-link" label={t("Copy attachment link")}>
                {files.map((f, i) => (
                    <Menu.MenuItem
                        key={f.id}
                        id={`vc-copy-media-link-${i}`}
                        label={f.filename}
                        action={() => copyWithToast(f.url, t("Link copied!"))}
                    />
                ))}
                <Menu.MenuItem
                    id="vc-copy-media-link-all"
                    label={t("All links")}
                    action={() => copyWithToast(files.map(f => f.url).join("\n"), t("Links copied!"))}
                />
            </Menu.MenuItem>
    );
};

export default definePlugin({
    name: "CopyMediaLink",
    authors: [Devs.Tsar],
    description: "Adds \"Copy attachment link\" to the right-click menu of a message that has files or images. With several files you can pick one or copy all the links.",
    tags: ["Chat", "Media"],

    contextMenus: {
        "message": messageCtxPatch
    }
});
