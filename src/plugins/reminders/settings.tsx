/*
 * Vencord, a Discord client mod
 * Copyright (c) 2026 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { definePluginSettings } from "@api/Settings";
import { Button } from "@components/Button";
import { OptionType } from "@utils/types";
import { React } from "@webpack/common";

import { openRemindersListModal } from "./RemindersListModal";

function ViewButton() {
    return (
        <Button size="small" onClick={() => openRemindersListModal()}>
            View reminders
        </Button>
    );
}

export const settings = definePluginSettings({
    showToasts: {
        type: OptionType.BOOLEAN,
        description: "Show a toast when a reminder is set and when it fires",
        default: true
    },
    view: {
        type: OptionType.COMPONENT,
        description: "See and cancel upcoming reminders",
        component: ViewButton
    }
});
