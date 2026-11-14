/*
 * Vencord, a Discord client mod
 * Copyright (c) 2026 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import ErrorBoundary from "@components/ErrorBoundary";
import { t } from "@utils/i18n";
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
    if (row.reason === "message" || row.reason === "typing") {
        const channel = row.channel_id ? ChannelStore.getChannel(row.channel_id) : null;
        const where = channel?.name ? `#${channel.name}` : (channel ? "a DM" : "a channel");
        return row.reason === "typing" ? `Started typing in ${where}` : `Sent a message in ${where}`;
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
        <Modal {...modalProps} size="lg" title={t("Last Seen")}>
            {isOnlineNow && (
                <Forms.FormText className={Margins.bottom8}>Currently online (status: {currentStatus}).</Forms.FormText>
            )}

            {error && <Forms.FormText style={{ color: "var(--text-danger)" }}>{error}</Forms.FormText>}

            {data === undefined && !error && <Forms.FormText>{t("Loading...")}</Forms.FormText>}

            {data === null && !isOnlineNow && <Forms.FormText>{t("No last-seen data recorded for this user yet.")}</Forms.FormText>}

            {data && (
                <>
                    {!isOnlineNow && (
                        <Forms.FormText className={Margins.bottom16}>
                            Last seen <Timestamp timestamp={new Date(data.latest.timestamp)} /> — {describe(data.latest)}
                        </Forms.FormText>
                    )}

                    {data.history.length > 1 && (
                        <>
                            <Forms.FormTitle tag="h5">{t("History")}</Forms.FormTitle>
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
