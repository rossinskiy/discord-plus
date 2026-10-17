/*
 * Vencord, a Discord client mod
 * Copyright (c) 2026 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { Button } from "@components/Button";
import ErrorBoundary from "@components/ErrorBoundary";
import { Margins } from "@utils/margins";
import type { RenderModalProps } from "@vencord/discord-types";
import { Forms, Modal, openModal, showToast, TextArea, TextInput, Toasts, UserStore,useState } from "@webpack/common";

import { entries, saveEntry } from "./api";

export function openTagsModal(userId: string) {
    openModal(props =>
        <ErrorBoundary>
            <TagsModal modalProps={props} userId={userId} />
        </ErrorBoundary>
    );
}

function TagsModal({ modalProps, userId }: { modalProps: RenderModalProps; userId: string; }) {
    const existing = entries.get(userId);
    const [note, setNote] = useState(existing?.note ?? "");
    const [tags, setTags] = useState<string[]>(existing?.tags ?? []);
    const [draft, setDraft] = useState("");
    const [saving, setSaving] = useState(false);

    const user = UserStore.getUser(userId);

    function addTag() {
        const tag = draft.trim().slice(0, 32);
        if (tag && !tags.includes(tag) && tags.length < 20) setTags([...tags, tag]);
        setDraft("");
    }

    async function save() {
        setSaving(true);
        try {
            await saveEntry(userId, note.trim(), tags);
            showToast("Saved.", Toasts.Type.SUCCESS);
            modalProps.onClose();
        } catch (e) {
            showToast("Failed to save: " + (e as Error).message, Toasts.Type.FAILURE);
            setSaving(false);
        }
    }

    return (
        <Modal {...modalProps} size="md" title={`Tags & Notes: ${user?.globalName ?? user?.username ?? userId}`}>
            <Forms.FormTitle>Tags</Forms.FormTitle>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }} className={Margins.bottom8}>
                {tags.length === 0 && <Forms.FormText>No tags yet.</Forms.FormText>}
                {tags.map(tag => (
                    <Button key={tag} size="small" variant="secondary" onClick={() => setTags(tags.filter(t => t !== tag))}>
                        {tag} ×
                    </Button>
                ))}
            </div>
            <div style={{ display: "flex", gap: 8 }} className={Margins.bottom16}>
                <TextInput
                    value={draft}
                    placeholder="Add a tag and press Enter"
                    onChange={setDraft}
                    onKeyDown={(e: React.KeyboardEvent) => {
                        if (e.key === "Enter") {
                            e.preventDefault();
                            addTag();
                        }
                    }}
                />
                <Button size="small" onClick={addTag}>Add</Button>
            </div>

            <Forms.FormTitle>Private note</Forms.FormTitle>
            <TextArea
                value={note}
                onChange={setNote}
                rows={5}
                maxLength={2000}
                placeholder="Only you can see this"
                className={Margins.bottom16}
            />

            <div style={{ display: "flex", justifyContent: "flex-end", gap: 8 }}>
                <Button variant="secondary" onClick={modalProps.onClose}>Cancel</Button>
                <Button variant="primary" disabled={saving} onClick={save}>Save</Button>
            </div>
        </Modal>
    );
}
