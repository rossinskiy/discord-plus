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
                    Toasts.show({ id: Toasts.genId(), type: Toasts.Type.SUCCESS, message: t("Last seen data cleared.") });
                } catch (e) {
                    Toasts.show({ id: Toasts.genId(), type: Toasts.Type.FAILURE, message: t("Failed to clear: ") + (e as Error).message });
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
    clearData: {
        type: OptionType.COMPONENT,
        description: t("Immediately delete all last-seen data stored on this computer"),
        component: ClearButton
    }
});
