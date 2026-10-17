/*
 * Vencord, a Discord client mod
 * Copyright (c) 2026 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { definePluginSettings } from "@api/Settings";
import { Button } from "@components/Button";
import { OptionType } from "@utils/types";
import { React } from "@webpack/common";

import { openBrowseModal } from "./BrowseModal";

function BrowseButton() {
    return (
        <Button size="small" onClick={() => openBrowseModal()}>
            Browse tagged people
        </Button>
    );
}

export const settings = definePluginSettings({
    serverUrl: {
        type: OptionType.STRING,
        description: "Discord+ archive server URL",
        default: "https://discordplus.karatel.win"
    },
    token: {
        type: OptionType.STRING,
        description: "Archive server auth token. Leave empty to use the token from MessageArchive",
        default: ""
    },
    showInMessages: {
        type: OptionType.BOOLEAN,
        description: "Show a person's tags next to their name in chat",
        default: true
    },
    browse: {
        type: OptionType.COMPONENT,
        description: "Filter everyone you've tagged by tag",
        component: BrowseButton
    }
});
