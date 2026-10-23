/*
 * Vencord, a Discord client mod
 * Copyright (c) 2026 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import "./style.css";

import { ChatBarButton, ChatBarButtonFactory } from "@api/ChatButtons";
import { ApplicationCommandInputType } from "@api/Commands";
import { definePluginSettings } from "@api/Settings";
import { Button } from "@components/Button";
import { Devs } from "@utils/constants";
import definePlugin, { IconComponent, OptionType } from "@utils/types";
import { React, showToast, Toasts } from "@webpack/common";

import { diskAvailable, revealSavePath, savePath } from "./disk";
import { formatDuration, formatNumber, resetGame, setAchievementHandler, startGame, stopGame, takeOfflineReport } from "./game";
import { openLoungeModal } from "./LoungeModal";

const LoungeIcon: IconComponent = ({ height = 20, width = 20, className }) => (
    <svg width={width} height={height} viewBox="0 0 24 24" className={className} aria-hidden="true">
        <path fill="currentColor" d="M12 2C9 6 5 8 5 13a7 7 0 0 0 14 0c0-5-4-7-7-11Zm0 17a4 4 0 0 1-4-4c0-2 1.5-3 4-6 2.5 3 4 4 4 6a4 4 0 0 1-4 4Z" />
    </svg>
);

const LoungeButton: ChatBarButtonFactory = ({ isMainChat }) => {
    if (!isMainChat) return null;
    return (
        <ChatBarButton tooltip="Idle Lounge" onClick={openLoungeModal}>
            <LoungeIcon />
        </ChatBarButton>
    );
};

function Controls() {
    const [armed, setArmed] = React.useState(false);
    const [path, setPath] = React.useState("");
    React.useEffect(() => { savePath().then(setPath); }, []);

    return (
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
            <Button size="small" onClick={openLoungeModal}>Open the lounge</Button>
            {diskAvailable() && (
                <Button size="small" variant="secondary" onClick={() => revealSavePath()}>Show save file</Button>
            )}
            <Button
                size="small"
                variant="dangerSecondary"
                onClick={() => {
                    if (!armed) return setArmed(true);
                    resetGame();
                    setArmed(false);
                }}
            >
                {armed ? "Really delete all progress?" : "Reset progress"}
            </Button>
            {path && <span style={{ fontSize: 12, color: "var(--text-muted)", width: "100%" }}>Saved to {path}</span>}
        </div>
    );
}

const settings = definePluginSettings({
    controls: {
        type: OptionType.COMPONENT,
        description: "Open the lounge or wipe your save",
        component: Controls
    }
});

export default definePlugin({
    name: "IdleLounge",
    authors: [Devs.Tsar],
    description: "A cozy place to sit and let time pass: an idle garden that grows while you do nothing, relaxed fishing for a collection of fish, and a calm aquarium or fireplace to stare at. Progress is saved on your PC.",
    tags: ["Fun", "Utility"],
    settings,

    chatBarButton: {
        icon: LoungeIcon,
        render: LoungeButton
    },

    async start() {
        await startGame();
        setAchievementHandler(text => showToast(text, Toasts.Type.SUCCESS));

        const away = takeOfflineReport();
        if (away) {
            showToast(`Welcome back. Your farm earned ${formatNumber(away.coins)} coins in ${formatDuration(away.seconds)}.`, Toasts.Type.SUCCESS);
        }
    },

    stop() {
        setAchievementHandler(undefined);
        stopGame();
    },

    commands: [
        {
            name: "lounge",
            description: "Open the Idle Lounge",
            inputType: ApplicationCommandInputType.BUILT_IN,
            execute() {
                openLoungeModal();
            }
        }
    ]
});
