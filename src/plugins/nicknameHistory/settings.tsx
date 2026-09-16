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

import { clearNameHistory } from "./api";

function ClearButton() {
    const [loading, setLoading] = React.useState(false);

    return (
        <Button
            size="small"
            variant="dangerPrimary"
            disabled={loading}
            onClick={async () => {
                setLoading(true);
                try {
                    await clearNameHistory();
                    Toasts.show({ id: Toasts.genId(), type: Toasts.Type.SUCCESS, message: "Name history cleared." });
                } catch (e) {
                    Toasts.show({ id: Toasts.genId(), type: Toasts.Type.FAILURE, message: "Failed to clear: " + (e as Error).message });
                } finally {
                    setLoading(false);
                }
            }}
        >
            Clear Name History Now
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
        description: "Archive server auth token (set this to the ARCHIVE_TOKEN configured on your server)",
        default: ""
    },
    trackUsernames: {
        type: OptionType.BOOLEAN,
        description: "Track global username/display name changes",
        default: true
    },
    trackNicknames: {
        type: OptionType.BOOLEAN,
        description: "Track per-server nickname changes",
        default: true
    },
    clearHistory: {
        type: OptionType.COMPONENT,
        description: "Immediately delete all tracked name history from the server",
        component: ClearButton
    }
});
