/*
 * Vencord, a Discord client mod
 * Copyright (c) 2026 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { Button } from "@components/Button";
import ErrorBoundary from "@components/ErrorBoundary";
import { Margins } from "@utils/margins";
import type { RenderModalProps } from "@vencord/discord-types";
import { Forms, Modal, openModal, showToast, TextInput, Toasts, useState } from "@webpack/common";

import { addReminder } from "./api";
import { parseDuration } from "./parseDuration";

interface RemindTarget {
    note: string;
    channelId?: string;
    messageId?: string;
    guildId?: string | null;
}

const QUICK_OPTIONS: { label: string; ms: number; }[] = [
    { label: "20 min", ms: 20 * 60_000 },
    { label: "1 hour", ms: 60 * 60_000 },
    { label: "3 hours", ms: 3 * 60 * 60_000 },
    { label: "Tomorrow", ms: 0 } // computed specially below
];

function tomorrowMorning(): number {
    const d = new Date();
    d.setDate(d.getDate() + 1);
    d.setHours(9, 0, 0, 0);
    return d.getTime() - Date.now();
}

export function openRemindModal(target: RemindTarget) {
    openModal(props =>
        <ErrorBoundary>
            <RemindModal modalProps={props} target={target} />
        </ErrorBoundary>
    );
}

function RemindModal({ modalProps, target }: { modalProps: RenderModalProps; target: RemindTarget; }) {
    const [custom, setCustom] = useState("");
    const [note, setNote] = useState(target.note);
    const [saving, setSaving] = useState(false);

    async function schedule(ms: number) {
        if (ms <= 0 || saving) return;
        setSaving(true);
        try {
            await addReminder({
                note: note.trim() || "Reminder",
                dueAt: Date.now() + ms,
                channelId: target.channelId,
                messageId: target.messageId,
                guildId: target.guildId
            });
            showToast("Reminder set.", Toasts.Type.SUCCESS);
            modalProps.onClose();
        } catch (e) {
            showToast("Failed to set reminder: " + (e as Error).message, Toasts.Type.FAILURE);
            setSaving(false);
        }
    }

    function scheduleCustom() {
        const ms = parseDuration(custom);
        if (!ms) {
            showToast("Couldn't understand that. Try \"10m\", \"2h\" or \"1d\".", Toasts.Type.FAILURE);
            return;
        }
        schedule(ms);
    }

    return (
        <Modal {...modalProps} size="small" title="Remind Me">
            <Forms.FormTitle>What to remind you about</Forms.FormTitle>
            <TextInput
                value={note}
                onChange={setNote}
                placeholder="Reminder text"
                maxLength={500}
                className={Margins.bottom16}
            />

            <Forms.FormTitle>When</Forms.FormTitle>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }} className={Margins.bottom16}>
                {QUICK_OPTIONS.map(opt => (
                    <Button
                        key={opt.label}
                        size="small"
                        variant="secondary"
                        disabled={saving}
                        onClick={() => schedule(opt.label === "Tomorrow" ? tomorrowMorning() : opt.ms)}
                    >
                        {opt.label}
                    </Button>
                ))}
            </div>

            <Forms.FormTitle>Or a custom time</Forms.FormTitle>
            <div style={{ display: "flex", gap: 8 }}>
                <TextInput
                    value={custom}
                    onChange={setCustom}
                    placeholder="e.g. 45m, 2h30m, 1d"
                    onKeyDown={(e: React.KeyboardEvent) => {
                        if (e.key === "Enter") {
                            e.preventDefault();
                            scheduleCustom();
                        }
                    }}
                />
                <Button size="small" disabled={saving} onClick={scheduleCustom}>Set</Button>
            </div>
        </Modal>
    );
}
