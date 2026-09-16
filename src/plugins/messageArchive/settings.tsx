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

import { definePluginSettings } from "@api/Settings";
import { Button } from "@components/Button";
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
                        message: "Archive cleared."
                    });
                } catch (e) {
                    Toasts.show({
                        id: Toasts.genId(),
                        type: Toasts.Type.FAILURE,
                        message: "Failed to clear archive: " + (e as Error).message
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
    serverUrl: {
        type: OptionType.STRING,
        description: "Discord+ message archive server URL",
        default: "https://discordplus.karatel.win"
    },
    token: {
        type: OptionType.STRING,
        description: "Archive server auth token (set this to the ARCHIVE_TOKEN configured on your server)",
        default: ""
    },
    deleteStyle: {
        type: OptionType.SELECT,
        description: "The style of deleted messages",
        default: "text",
        options: [
            { label: "Red text", value: "text", default: true },
            { label: "Red overlay", value: "overlay" }
        ]
    },
    collapseDeleted: {
        type: OptionType.BOOLEAN,
        description: "Whether to collapse deleted messages, similar to blocked messages",
        default: false,
        restartNeeded: true
    },
    logDeletedAttachments: {
        type: OptionType.BOOLEAN,
        description: "Whether to log deleted attachments",
        default: true,
        restartNeeded: true
    },
    inlineEdits: {
        type: OptionType.BOOLEAN,
        description: "Whether to display edit history as part of message content",
        default: true
    },
    logEdits: {
        type: OptionType.BOOLEAN,
        description: "Whether to archive edited messages",
        default: true
    },
    logDeletes: {
        type: OptionType.BOOLEAN,
        description: "Whether to archive deleted messages",
        default: true
    },
    ignoreBots: {
        type: OptionType.BOOLEAN,
        description: "Whether to ignore messages by bots",
        default: true
    },
    ignoreSelf: {
        type: OptionType.BOOLEAN,
        description: "Whether to ignore messages by yourself",
        default: false
    },
    ignoreUsers: {
        type: OptionType.STRING,
        description: "Comma-separated list of user IDs to ignore",
        default: "",
        multiline: true
    },
    ignoreChannels: {
        type: OptionType.STRING,
        description: "Comma-separated list of channel IDs to ignore",
        default: "",
        multiline: true
    },
    ignoreGuilds: {
        type: OptionType.STRING,
        description: "Comma-separated list of guild IDs to ignore",
        default: "",
        multiline: true
    },
    clearArchive: {
        type: OptionType.COMPONENT,
        description: "Immediately delete all archived messages from the server (they also auto-expire after 7 days)",
        component: ClearArchiveButton
    }
});
