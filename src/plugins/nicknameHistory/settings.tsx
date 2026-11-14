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
                    Toasts.show({ id: Toasts.genId(), type: Toasts.Type.SUCCESS, message: t("Name history cleared.") });
                } catch (e) {
                    Toasts.show({ id: Toasts.genId(), type: Toasts.Type.FAILURE, message: t("Failed to clear: ") + (e as Error).message });
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
    trackUsernames: {
        type: OptionType.BOOLEAN,
        description: t("Track global username/display name changes"),
        default: true
    },
    trackNicknames: {
        type: OptionType.BOOLEAN,
        description: t("Track per-server nickname changes"),
        default: true
    },
    clearHistory: {
        type: OptionType.COMPONENT,
        description: t("Immediately delete all tracked name history stored on this computer"),
        component: ClearButton
    }
});
