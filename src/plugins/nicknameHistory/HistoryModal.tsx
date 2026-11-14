/*
 * Vencord, a Discord client mod
 * Copyright (c) 2026 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import ErrorBoundary from "@components/ErrorBoundary";
import { t } from "@utils/i18n";
import { Margins } from "@utils/margins";
import type { RenderModalProps } from "@vencord/discord-types";
import { Forms, GuildStore, Modal, openModal, Timestamp, useEffect, useState } from "@webpack/common";

import { getNameHistory, NameChangeRow } from "./api";

const FIELD_LABELS: Record<string, string> = {
    username: "Username",
    globalName: "Display Name",
    nickname: "Server Nickname"
};

function guildName(guildId: string | null) {
    if (!guildId) return "Global";
    return GuildStore.getGuild(guildId)?.name ?? guildId;
}

export function openNameHistoryModal(userId: string) {
    openModal(props =>
        <ErrorBoundary>
            <NameHistoryModal modalProps={props} userId={userId} />
        </ErrorBoundary>
    );
}

function NameHistoryModal({ modalProps, userId }: { modalProps: RenderModalProps; userId: string; }) {
    const [rows, setRows] = useState<NameChangeRow[] | null>(null);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        getNameHistory(userId)
            .then(setRows)
            .catch(e => setError(e.message));
    }, [userId]);

    return (
        <Modal {...modalProps} size="lg" title={t("Name History")}>
            {error && <Forms.FormText style={{ color: "var(--text-danger)" }}>{error}</Forms.FormText>}

            {!rows && !error && <Forms.FormText>{t("Loading...")}</Forms.FormText>}

            {rows && rows.length === 0 && <Forms.FormText>{t("No name changes recorded for this user yet.")}</Forms.FormText>}

            {rows && rows.length > 0 && (
                <div style={{ maxHeight: 400, overflowY: "auto" }}>
                    {rows.slice().reverse().map((row, i) => (
                        <div key={i} className={Margins.bottom16}>
                            <Forms.FormText style={{ color: "var(--text-muted)", fontSize: 12 }}>
                                {FIELD_LABELS[row.field] ?? row.field} in {guildName(row.guild_id)} — <Timestamp timestamp={new Date(row.changed_at)} />
                            </Forms.FormText>
                            <Forms.FormText>
                                {row.old_value || "(none)"} → {row.new_value || "(none)"}
                            </Forms.FormText>
                        </div>
                    ))}
                </div>
            )}
        </Modal>
    );
}
