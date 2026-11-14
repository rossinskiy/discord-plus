/*
 * Vencord, a Discord client mod
 * Copyright (c) 2026 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import ErrorBoundary from "@components/ErrorBoundary";
import { classNameFactory } from "@utils/css";
import { t } from "@utils/i18n";
import { Margins } from "@utils/margins";
import { classes } from "@utils/misc";
import type { RenderModalProps } from "@vencord/discord-types";
import { findCssClassesLazy } from "@webpack";
import { Forms, Modal, openModal, TabBar, Timestamp, useEffect, useState } from "@webpack/common";

import { ArchiveHistory, getHistory } from "./api";
import { parseEditContent } from "./parseEditContent";

const CodeContainerClasses = findCssClassesLazy("markup", "codeContainer");
const MiscClasses = findCssClassesLazy("messageContent", "markupRtl");

const cl = classNameFactory("vc-ma-modal-");

export function openHistoryModal(messageId: string) {
    openModal(props =>
        <ErrorBoundary>
            <HistoryModal modalProps={props} messageId={messageId} />
        </ErrorBoundary>
    );
}

function HistoryModal({ modalProps, messageId }: { modalProps: RenderModalProps; messageId: string; }) {
    const [history, setHistory] = useState<ArchiveHistory | null | undefined>(undefined);
    const [error, setError] = useState<string | null>(null);
    const [currentTab, setCurrentTab] = useState(0);

    useEffect(() => {
        getHistory(messageId)
            .then(h => {
                setHistory(h);
                setCurrentTab(h?.edits.length ?? 0);
            })
            .catch(e => setError(e.message));
    }, [messageId]);

    if (error) {
        return (
            <Modal {...modalProps} title={t("Message Archive History")}>
                <Forms.FormText style={{ color: "var(--text-danger)" }}>{error}</Forms.FormText>
            </Modal>
        );
    }

    if (history === undefined) {
        return (
            <Modal {...modalProps} title={t("Message Archive History")}>
                <Forms.FormText>{t("Loading...")}</Forms.FormText>
            </Modal>
        );
    }

    if (history === null) {
        return (
            <Modal {...modalProps} title={t("Message Archive History")}>
                <Forms.FormText>{t("No archived history found for this message.")}</Forms.FormText>
            </Modal>
        );
    }

    const timestamps = [history.current.createdAt, ...history.edits.map(e => e.edited_at)];
    const contents = [...history.edits.map(e => e.old_content), history.current.content];

    return (
        <Modal
            {...modalProps}
            size="lg"
            title={t("Message Archive History")}
        >
            {history.deletedAt && (
                <Forms.FormText style={{ color: "var(--text-danger)" }} className={Margins.bottom8}>
                    Deleted at <Timestamp timestamp={new Date(history.deletedAt)} />
                </Forms.FormText>
            )}

            <TabBar
                type="top"
                look="brand"
                className={classes("vc-settings-tab-bar", cl("tab-bar"))}
                selectedItem={currentTab}
                onItemSelect={setCurrentTab}
            >
                {timestamps.map((timestamp, index) => (
                    <TabBar.Item
                        key={index}
                        className="vc-settings-tab-bar-item"
                        id={index}
                    >
                        <Timestamp
                            className={cl("timestamp")}
                            timestamp={new Date(timestamp)}
                            isEdited={index > 0}
                            isInline={false}
                        />
                    </TabBar.Item>
                ))}
            </TabBar>

            <div className={classes(CodeContainerClasses.markup, MiscClasses.messageContent, Margins.top20)}>
                {parseEditContent(contents[currentTab] || "(empty)", history.current.channelId)}
            </div>
        </Modal>
    );
}
