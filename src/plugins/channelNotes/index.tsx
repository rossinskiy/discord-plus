/*
 * Vencord, a Discord client mod
 * Copyright (c) 2026 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { NavContextMenuPatchCallback } from "@api/ContextMenu";
import { del, get, set } from "@api/DataStore";
import ErrorBoundary from "@components/ErrorBoundary";
import { Devs } from "@utils/constants";
import { t } from "@utils/i18n";
import definePlugin from "@utils/types";
import type { Channel, RenderModalProps } from "@vencord/discord-types";
import { Forms, Menu, Modal, openModal, showToast, TextArea, Toasts, useEffect, useState } from "@webpack/common";

const KEY_PREFIX = "ChannelNotes_";
const MAX_LENGTH = 2000;

const noteKey = (channelId: string) => KEY_PREFIX + channelId;

function NotesModal({ modalProps, channel }: { modalProps: RenderModalProps; channel: Channel; }) {
    const [text, setText] = useState("");
    const [loaded, setLoaded] = useState(false);

    useEffect(() => {
        get<string>(noteKey(channel.id))
            .then(v => setText(v ?? ""))
            .catch(() => showToast(t("Could not load the note"), Toasts.Type.FAILURE))
            .finally(() => setLoaded(true));
    }, [channel.id]);

    async function save() {
        try {
            const value = text.trim();
            if (value) await set(noteKey(channel.id), value);
            else await del(noteKey(channel.id));
            showToast(value ? t("Note saved") : t("Note removed"), Toasts.Type.SUCCESS);
            modalProps.onClose();
        } catch {
            showToast(t("Could not save the note"), Toasts.Type.FAILURE);
        }
    }

    return (
        <Modal
            {...modalProps}
            title={t("Notes for #{name}", { name: channel.name || "channel" })}
            actions={[{ text: t("Save"), variant: "primary", onClick: save, disabled: !loaded }]}
        >
            <Forms.FormText style={{ marginBottom: 8 }}>
                {t("Private to you, stored on this computer only. Empty text deletes the note.")}
            </Forms.FormText>
            <TextArea
                value={text}
                onChange={(v: string) => setText(v.slice(0, MAX_LENGTH))}
                rows={8}
                placeholder={t("Write a note about this channel")}
                disabled={!loaded}
            />
            <Forms.FormText style={{ marginTop: 4, color: "var(--text-muted)" }}>
                {text.length}/{MAX_LENGTH}
            </Forms.FormText>
        </Modal>
    );
}

const channelContextPatch: NavContextMenuPatchCallback = (children, { channel }: { channel?: Channel; }) => {
    if (!channel?.id) return;

    children.push(
        <Menu.MenuItem
            id="vc-channel-notes"
            label={t("Channel Notes")}
            action={() => openModal(props =>
                <ErrorBoundary>
                    <NotesModal modalProps={props} channel={channel} />
                </ErrorBoundary>
            )}
        />
    );
};

export default definePlugin({
    name: "ChannelNotes",
    description: "Right click a channel and pick Channel Notes to keep a private note about it. Notes stay on your computer.",
    tags: ["Utility"],
    authors: [Devs.Tsar],

    contextMenus: {
        "channel-context": channelContextPatch
    }
});
