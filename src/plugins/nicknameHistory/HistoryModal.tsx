/*
 * Discord+, a fork of Vencord
 * Copyright (c) 2023 Vendicated and contributors
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU General Public License for more details.
 *
 * You should have received a copy of the GNU General Public License
 * along with this program.  If not, see <https://www.gnu.org/licenses/>.
*/

import ErrorBoundary from "@components/ErrorBoundary";
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
        <Modal {...modalProps} size="lg" title="Name History">
            {error && <Forms.FormText style={{ color: "var(--text-danger)" }}>{error}</Forms.FormText>}

            {!rows && !error && <Forms.FormText>Loading...</Forms.FormText>}

            {rows && rows.length === 0 && <Forms.FormText>No name changes recorded for this user yet.</Forms.FormText>}

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
