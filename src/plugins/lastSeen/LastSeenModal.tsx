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
import { ChannelStore, Forms, Modal, openModal, PresenceStore, Timestamp, useEffect, useState } from "@webpack/common";

import { getLastSeen, PresenceHistoryRow } from "./api";

export function openLastSeenModal(userId: string) {
    openModal(props =>
        <ErrorBoundary>
            <LastSeenModal modalProps={props} userId={userId} />
        </ErrorBoundary>
    );
}

function describe(row: PresenceHistoryRow) {
    if (row.reason === "message") {
        const channel = row.channel_id ? ChannelStore.getChannel(row.channel_id) : null;
        const where = channel?.name ? `#${channel.name}` : (channel ? "a DM" : "a channel");
        return `Sent a message in ${where}`;
    }
    return `Went offline (was ${row.status ?? "online"})`;
}

function LastSeenModal({ modalProps, userId }: { modalProps: RenderModalProps; userId: string; }) {
    const [data, setData] = useState<{ latest: PresenceHistoryRow; history: PresenceHistoryRow[]; } | null | undefined>(undefined);
    const [error, setError] = useState<string | null>(null);

    const currentStatus = PresenceStore.getStatus(userId);
    const isOnlineNow = currentStatus && currentStatus !== "offline";

    useEffect(() => {
        getLastSeen(userId)
            .then(setData)
            .catch(e => setError(e.message));
    }, [userId]);

    return (
        <Modal {...modalProps} size="lg" title="Last Seen">
            {isOnlineNow && (
                <Forms.FormText className={Margins.bottom8}>Currently online (status: {currentStatus}).</Forms.FormText>
            )}

            {error && <Forms.FormText style={{ color: "var(--text-danger)" }}>{error}</Forms.FormText>}

            {data === undefined && !error && <Forms.FormText>Loading...</Forms.FormText>}

            {data === null && !isOnlineNow && <Forms.FormText>No last-seen data recorded for this user yet.</Forms.FormText>}

            {data && (
                <>
                    {!isOnlineNow && (
                        <Forms.FormText className={Margins.bottom16}>
                            Last seen <Timestamp timestamp={new Date(data.latest.timestamp)} /> — {describe(data.latest)}
                        </Forms.FormText>
                    )}

                    {data.history.length > 1 && (
                        <>
                            <Forms.FormTitle tag="h5">History</Forms.FormTitle>
                            <div style={{ maxHeight: 300, overflowY: "auto" }}>
                                {data.history.map((row, i) => (
                                    <Forms.FormText key={i} style={{ color: "var(--text-muted)", fontSize: 12 }} className={Margins.bottom8}>
                                        <Timestamp timestamp={new Date(row.timestamp)} /> — {describe(row)}
                                    </Forms.FormText>
                                ))}
                            </div>
                        </>
                    )}
                </>
            )}

            <Forms.FormText style={{ color: "var(--text-muted)", fontSize: 12, marginTop: 8 }}>
                Based only on activity observed while your own client was online — not a complete record.
            </Forms.FormText>
        </Modal>
    );
}
