/*
 * Vencord, a Discord client mod
 * Copyright (c) 2026 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { Button } from "@components/Button";
import ErrorBoundary from "@components/ErrorBoundary";
import { Margins } from "@utils/margins";
import type { RenderModalProps } from "@vencord/discord-types";
import { Forms, Modal, openModal, Timestamp, useEffect, useState } from "@webpack/common";

import { Reminder, reminders, removeReminder, subscribe } from "./api";

export function openRemindersListModal() {
    openModal(props =>
        <ErrorBoundary>
            <RemindersListModal modalProps={props} />
        </ErrorBoundary>
    );
}

function RemindersListModal({ modalProps }: { modalProps: RenderModalProps; }) {
    const [, force] = useState(0);
    useEffect(() => subscribe(() => force(n => n + 1)), []);

    return (
        <Modal {...modalProps} size="lg" title="Reminders">
            {reminders.length === 0 && (
                <Forms.FormText>No reminders scheduled. Right-click a message and choose "Remind Me".</Forms.FormText>
            )}

            <div style={{ maxHeight: 420, overflowY: "auto" }}>
                {reminders.map(r => <Row key={r.id} reminder={r} />)}
            </div>
        </Modal>
    );
}

function Row({ reminder }: { reminder: Reminder; }) {
    return (
        <div className={Margins.bottom16} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12 }}>
            <div>
                <Forms.FormText style={{ whiteSpace: "pre-wrap" }}>{reminder.note}</Forms.FormText>
                <Forms.FormText style={{ color: "var(--text-muted)", fontSize: 12 }}>
                    <Timestamp timestamp={new Date(reminder.dueAt)} />
                </Forms.FormText>
            </div>
            <Button size="small" variant="dangerSecondary" onClick={() => removeReminder(reminder.id)}>
                Cancel
            </Button>
        </div>
    );
}
