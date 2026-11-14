/*
 * Vencord, a Discord client mod
 * Copyright (c) 2026 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { useSettings } from "@api/Settings";
import ErrorBoundary from "@components/ErrorBoundary";
import { Heading } from "@components/Heading";
import { Margins } from "@components/margins";
import { Paragraph } from "@components/Paragraph";
import { t } from "@utils/i18n";
import { relaunch } from "@utils/native";
import { ConfirmModal, openModal, Select } from "@webpack/common";

export function LanguageSettings() {
    const settings = useSettings(["locale"]);

    function change(value: "auto" | "en" | "ru") {
        settings.locale = value;

        openModal(props => (
            <ConfirmModal
                {...props}
                title={t("Restart Required")}
                subtitle={t("A restart is required to apply this change")}
                confirmText={t("Restart now")}
                cancelText={t("Later!")}
                variant="primary"
                onConfirm={relaunch}
            />
        ));
    }

    return (
        <ErrorBoundary noop>
            <Heading tag="h5">{t("Language")}</Heading>
            <Paragraph className={Margins.bottom8}>
                {t("Interface language of Discord+. Follows the Discord language when set to Automatic.")}
            </Paragraph>

            <Select
                placeholder={t("Automatic")}
                options={[
                    { label: t("Automatic"), value: "auto", default: true },
                    { label: "English", value: "en" },
                    { label: "Русский", value: "ru" }
                ]}
                closeOnSelect={true}
                select={change}
                isSelected={v => v === settings.locale}
                serialize={s => s}
            />
        </ErrorBoundary>
    );
}
