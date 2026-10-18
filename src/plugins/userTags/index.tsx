/*
 * Vencord, a Discord client mod
 * Copyright (c) 2026 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { NavContextMenuPatchCallback } from "@api/ContextMenu";
import { Devs } from "@utils/constants";
import definePlugin from "@utils/types";
import type { User } from "@vencord/discord-types";
import { Menu, useEffect, useState } from "@webpack/common";

import { entries, loadEntries, subscribe } from "./api";
import { settings } from "./settings";
import { openTagsModal } from "./TagsModal";

const TagsMenuItem: NavContextMenuPatchCallback = (children, { user }: { user: User; }) => {
    if (!user) return;

    children.push(
        <Menu.MenuItem
            id="vc-user-tags"
            label="Tags & Notes"
            action={() => openTagsModal(user.id)}
        />
    );
};

function MessageTags({ message }: { message: { author?: { id: string; }; }; }) {
    const [, force] = useState(0);
    useEffect(() => subscribe(() => force(n => n + 1)), []);

    const id = message?.author?.id;
    const entry = id ? entries.get(id) : undefined;
    if (!settings.store.showInMessages || !entry?.tags.length) return null;

    return (
        <span style={{ marginLeft: 4, display: "inline-flex", gap: 4, verticalAlign: "middle" }}>
            {entry.tags.map(tag => (
                <span
                    key={tag}
                    title={entry.note || undefined}
                    style={{
                        fontSize: 10,
                        lineHeight: "14px",
                        padding: "0 4px",
                        borderRadius: 3,
                        background: "var(--background-modifier-selected)",
                        color: "var(--text-muted)"
                    }}
                >
                    {tag}
                </span>
            ))}
        </span>
    );
}

export default definePlugin({
    name: "UserTags",
    authors: [Devs.Tsar],
    description: "Add your own tags and a private note to any person (e.g. \"work\", \"owes money\"), shown next to their name in chat and filterable by tag. Stored locally on your own computer, separate from Discord's built-in notes.",
    tags: ["Utility"],
    settings,
    contextMenus: {
        "user-context": TagsMenuItem
    },

    renderMessageDecoration: props => <MessageTags message={props.message} />,

    start() {
        loadEntries();
    },

    stop() {
        entries.clear();
    }
});
