/*
 * Vencord, a Discord client mod
 * Copyright (c) 2026 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { Button } from "@components/Button";
import { Paragraph } from "@components/Paragraph";
import { enterBotMode, getBotInfo, isBotMode, leaveBotMode } from "@plugins/botClient/utils/botMode";
import { originalSessionStorage, RegExToken } from "@plugins/botClient/utils/common";
import { showToast } from "@plugins/botClient/utils/toast";
import { t } from "@utils/i18n";
import { findByPropsLazy } from "@webpack";
import { FluxDispatcher, TextInput, useState } from "@webpack/common";

const LoginToken = findByPropsLazy("loginToken", "login");

export function BotLoginSetting() {
    const [token, setToken] = useState("");
    const [busy, setBusy] = useState(false);

    function logout() {
        leaveBotMode();
        if (typeof LoginToken.logout === "function") LoginToken.logout();
        else FluxDispatcher.dispatch({ type: "LOGOUT" });
    }

    async function login() {
        const value = token.trim().replace(/^Bot\s+/i, "");
        if (!RegExToken.test(value)) return showToast({ text: t("Invalid bot token"), variant: "critical" });
        setBusy(true);
        // Validate first so a typo does not kick you out of your current account
        const info = await getBotInfo(value);
        if (!info.success) {
            setBusy(false);
            return showToast({ text: t("Login failure: {message}", { message: info.message }), variant: "critical" });
        }
        originalSessionStorage.setItem("currentShard", "0");
        enterBotMode();
        LoginToken.loginToken(value);
    }

    if (isBotMode()) {
        return (
            <div>
                <Paragraph>{t("You are logged in as a bot. Logging out returns you to the normal login screen.")}</Paragraph>
                <Button onClick={logout}>{t("Log out of bot")}</Button>
            </div>
        );
    }

    return (
        <div>
            <Paragraph>
                {t("Logs this client in as a bot. Your current account is replaced by the bot until you log out; log in normally afterwards to come back.")}
            </Paragraph>
            <TextInput type="password" placeholder={t("Bot token")} value={token} onChange={setToken} autoComplete="off" />
            <Button onClick={login} disabled={busy || !token}>{t("Log in as bot")}</Button>
        </div>
    );
}
