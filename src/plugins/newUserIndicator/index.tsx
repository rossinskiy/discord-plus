/*
 * Vencord, a Discord client mod
 * Copyright (c) 2026 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { definePluginSettings } from "@api/Settings";
import { Devs } from "@utils/constants";
import { t } from "@utils/i18n";
import definePlugin, { OptionType } from "@utils/types";
import { UserStore } from "@webpack/common";

import { accountAgeDays } from "./accountAge";

const settings = definePluginSettings({
    maxDays: {
        type: OptionType.NUMBER,
        description: t("Mark accounts created within this many days"),
        default: 7
    }
});

export default definePlugin({
    name: "NewUserIndicator",
    authors: [Devs.Tsar],
    description: "Puts a small \"New\" mark next to the name of accounts that were created only a few days ago. Fresh accounts are common among spammers and scammers. The mark is a hint, not proof of anything.",
    tags: ["Chat", "Privacy"],
    settings,

    renderMessageDecoration({ message }) {
        const { author } = message;
        if (!author || author.bot || author.id === UserStore.getCurrentUser()?.id) return null;
        const days = accountAgeDays(author.id);
        if (days == null || days >= Math.max(1, settings.store.maxDays)) return null;

        const label = days === 0 ? t("Account created today") : t("Account created {n} days ago", { n: days });
        return (
            <span
                title={label}
                style={{
                    marginLeft: 4,
                    padding: "0 4px",
                    borderRadius: 3,
                    fontSize: "10px",
                    fontWeight: 600,
                    textTransform: "uppercase",
                    verticalAlign: "middle",
                    color: "var(--text-warning, #faa61a)",
                    border: "1px solid currentColor"
                }}
            >
                {t("New")}
            </span>
        );
    }
});
