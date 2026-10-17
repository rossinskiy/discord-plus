/*
 * Vencord, a Discord client mod
 * Copyright (c) 2026 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { Button } from "@components/Button";
import ErrorBoundary from "@components/ErrorBoundary";
import { Margins } from "@utils/margins";
import type { RenderModalProps } from "@vencord/discord-types";
import { Forms, Modal, openModal, useEffect, UserStore,useState } from "@webpack/common";

import { entries, loadEntries, subscribe, UserTagEntry } from "./api";
import { openTagsModal } from "./TagsModal";

export function openBrowseModal() {
    openModal(props =>
        <ErrorBoundary>
            <BrowseModal modalProps={props} />
        </ErrorBoundary>
    );
}

function BrowseModal({ modalProps }: { modalProps: RenderModalProps; }) {
    const [, force] = useState(0);
    const [filter, setFilter] = useState<string | null>(null);

    useEffect(() => {
        loadEntries();
        return subscribe(() => force(n => n + 1));
    }, []);

    const all = [...entries.values()];
    const allTags = [...new Set(all.flatMap(e => e.tags))].sort((a, b) => a.localeCompare(b));
    const shown = all.filter(e => !filter || e.tags.includes(filter));

    return (
        <Modal {...modalProps} size="lg" title="Tagged people">
            <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }} className={Margins.bottom16}>
                <Button size="small" variant={filter === null ? "primary" : "secondary"} onClick={() => setFilter(null)}>
                    All ({all.length})
                </Button>
                {allTags.map(tag => (
                    <Button key={tag} size="small" variant={filter === tag ? "primary" : "secondary"} onClick={() => setFilter(tag)}>
                        {tag}
                    </Button>
                ))}
            </div>

            {shown.length === 0 && <Forms.FormText>Nobody here yet. Right-click a person and choose Tags & Notes.</Forms.FormText>}

            <div style={{ maxHeight: 420, overflowY: "auto" }}>
                {shown.map(entry => <Row key={entry.userId} entry={entry} />)}
            </div>
        </Modal>
    );
}

function Row({ entry }: { entry: UserTagEntry; }) {
    const user = UserStore.getUser(entry.userId);

    return (
        <div className={Margins.bottom16} style={{ display: "flex", justifyContent: "space-between", gap: 12 }}>
            <div>
                <Forms.FormText style={{ fontWeight: 600 }}>
                    {user ? `${user.globalName ?? user.username} (@${user.username})` : entry.userId}
                </Forms.FormText>
                {entry.tags.length > 0 && (
                    <Forms.FormText style={{ color: "var(--text-muted)", fontSize: 12 }}>{entry.tags.join(", ")}</Forms.FormText>
                )}
                {entry.note && <Forms.FormText style={{ whiteSpace: "pre-wrap" }}>{entry.note}</Forms.FormText>}
            </div>
            <Button size="small" variant="secondary" onClick={() => openTagsModal(entry.userId)}>Edit</Button>
        </div>
    );
}
