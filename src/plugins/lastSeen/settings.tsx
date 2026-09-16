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

import { clearLastSeen } from "./api";

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
                    await clearLastSeen();
                    Toasts.show({ id: Toasts.genId(), type: Toasts.Type.SUCCESS, message: "Last seen data cleared." });
                } catch (e) {
                    Toasts.show({ id: Toasts.genId(), type: Toasts.Type.FAILURE, message: "Failed to clear: " + (e as Error).message });
                } finally {
                    setLoading(false);
                }
            }}
        >
            Clear Last Seen Data Now
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
    clearData: {
        type: OptionType.COMPONENT,
        description: "Immediately delete all last-seen data from the server",
        component: ClearButton
    }
});
