/*
 * Vencord, a Discord client mod
 * Copyright (c) 2026 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { definePluginSettings } from "@api/Settings";
import { Button } from "@components/Button";
import { t } from "@utils/i18n";
import { OptionType } from "@utils/types";
import { React, Toasts } from "@webpack/common";

import { clearArchive } from "./api";

function ClearArchiveButton() {
    const [loading, setLoading] = React.useState(false);

    return (
        <Button
            size="small"
            variant="dangerPrimary"
            disabled={loading}
            onClick={async () => {
                setLoading(true);
                try {
                    await clearArchive();
                    Toasts.show({
                        id: Toasts.genId(),
                        type: Toasts.Type.SUCCESS,
                        message: t("Archive cleared.")
                    });
                } catch (e) {
                    Toasts.show({
                        id: Toasts.genId(),
                        type: Toasts.Type.FAILURE,
                        message: t("Failed to clear archive: ") + (e as Error).message
                    });
                } finally {
                    setLoading(false);
                }
            }}
        >
            Clear Archive Now
        </Button>
    );
}

export const settings = definePluginSettings({
    deleteStyle: {
        type: OptionType.SELECT,
        description: t("The style of deleted messages"),
        default: "text",
        options: [
            { label: t("Red text"), value: "text", default: true },
            { label: t("Red overlay"), value: "overlay" }
        ]
    },
    collapseDeleted: {
        type: OptionType.BOOLEAN,
        description: t("Whether to collapse deleted messages, similar to blocked messages"),
        default: false,
        restartNeeded: true
    },
    logDeletedAttachments: {
        type: OptionType.BOOLEAN,
        description: t("Whether to log deleted attachments"),
        default: true,
        restartNeeded: true
    },
    inlineEdits: {
        type: OptionType.BOOLEAN,
        description: t("Whether to display edit history as part of message content"),
        default: true
    },
    logEdits: {
        type: OptionType.BOOLEAN,
        description: t("Whether to archive edited messages"),
        default: true
    },
    logDeletes: {
        type: OptionType.BOOLEAN,
        description: t("Whether to archive deleted messages"),
        default: true
    },
    ignoreBots: {
        type: OptionType.BOOLEAN,
        description: t("Whether to ignore messages by bots"),
        default: true
    },
    ignoreSelf: {
        type: OptionType.BOOLEAN,
        description: t("Whether to ignore messages by yourself"),
        default: false
    },
    ignoreUsers: {
        type: OptionType.STRING,
        description: t("Comma-separated list of user IDs to ignore"),
        default: "",
        multiline: true
    },
    ignoreChannels: {
        type: OptionType.STRING,
        description: t("Comma-separated list of channel IDs to ignore"),
        default: "",
        multiline: true
    },
    ignoreGuilds: {
        type: OptionType.STRING,
        description: t("Comma-separated list of guild IDs to ignore"),
        default: "",
        multiline: true
    },
    clearArchive: {
        type: OptionType.COMPONENT,
        description: t("Immediately delete all archived messages stored on this computer (they also auto-expire after 7 days)"),
        component: ClearArchiveButton
    }
});
