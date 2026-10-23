/*
 * Vencord, a Discord client mod
 * Copyright (c) 2026 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { definePluginSettings } from "@api/Settings";
import { Button } from "@components/Button";
import { OptionType } from "@utils/types";
import { Forms, React, useEffect, useState } from "@webpack/common";

import {
    addLocalBadge, clearBadgeCache, configureRemote, imageToBadge, localBadges,
    removeLocalBadge, subscribe
} from "./badges";
import { StaffPanel } from "./StaffPanel";

export const DEFAULT_SERVER = "https://discordplus.karatel.win";

function LocalBadgesEditor() {
    const [, force] = useState(0);
    useEffect(() => subscribe(() => force(n => n + 1)), []);

    const [tooltip, setTooltip] = useState("");
    const [image, setImage] = useState("");
    const [position, setPosition] = useState<"start" | "end">("start");
    const [error, setError] = useState("");

    async function onFile(e: React.ChangeEvent<HTMLInputElement>) {
        const file = e.target.files?.[0];
        if (!file) return;
        try {
            setImage(await imageToBadge(file));
            setError("");
        } catch (err) {
            setError(String((err as Error).message));
        }
    }

    return (
        <div className="vc-myprofile">
            <Forms.FormText>
                Badges you add here show on your own profile and nowhere else, so it is fine to copy the look of a real
                Discord badge. Nobody else can see them.
            </Forms.FormText>

            <div className="vc-myprofile-list">
                {localBadges.map(b => (
                    <div className="vc-myprofile-row" key={b.id}>
                        <img src={b.image} alt="" width={24} height={24} />
                        <span>{b.description} <span className="vc-myprofile-muted">({b.position === "start" ? "start" : "end"})</span></span>
                        <Button size="small" variant="dangerSecondary" onClick={() => removeLocalBadge(b.id)}>Remove</Button>
                    </div>
                ))}
                {localBadges.length === 0 && <span className="vc-myprofile-muted">No badges yet.</span>}
            </div>

            <div className="vc-myprofile-form">
                <input
                    className="vc-myprofile-input"
                    placeholder="Name shown when you hover the badge"
                    value={tooltip}
                    maxLength={40}
                    onChange={e => setTooltip(e.target.value)}
                />
                <input type="file" accept="image/*" onChange={onFile} aria-label="Badge image" />
                {image && <img src={image} alt="Badge preview" width={32} height={32} />}
                <div className="vc-myprofile-actions">
                    <Button size="small" variant={position === "start" ? "primary" : "secondary"} onClick={() => setPosition("start")}>First</Button>
                    <Button size="small" variant={position === "end" ? "primary" : "secondary"} onClick={() => setPosition("end")}>Last</Button>
                    <Button
                        size="small"
                        disabled={!tooltip.trim() || !image}
                        onClick={async () => {
                            await addLocalBadge({ name: tooltip.trim(), description: tooltip.trim(), image, position });
                            setTooltip("");
                            setImage("");
                        }}
                    >
                        Add badge
                    </Button>
                </div>
                {error && <span className="vc-myprofile-error">{error}</span>}
            </div>
        </div>
    );
}

function AdminPanel() {
    const [token, setToken] = useState(settings.store.adminToken);
    return <StaffPanel token={token} setToken={t => { setToken(t); settings.store.adminToken = t; }} />;
}

export const settings = definePluginSettings({
    customName: {
        type: OptionType.STRING,
        description: "Your display name as you see it, in chat and on your profile. Only you see it. Press Ctrl+R after changing it.",
        default: ""
    },
    showOfficialBadges: {
        type: OptionType.BOOLEAN,
        description: "Show Discord+ badges on other people's profiles. This asks the Discord+ server which of the users you look at have one, sending their user IDs.",
        default: true,
        onChange: () => {
            clearBadgeCache();
            configureRemote(settings.store.serverUrl, settings.store.showOfficialBadges);
        }
    },
    serverUrl: {
        type: OptionType.STRING,
        description: "Address of the Discord+ server that keeps the badge list",
        default: DEFAULT_SERVER,
        onChange: () => {
            clearBadgeCache();
            configureRemote(settings.store.serverUrl, settings.store.showOfficialBadges);
        }
    },
    adminToken: {
        type: OptionType.STRING,
        description: "Staff token (filled in from the panel below)",
        default: "",
        hidden: true
    },
    badges: {
        type: OptionType.COMPONENT,
        description: "Your own badges",
        component: LocalBadgesEditor
    },
    admin: {
        type: OptionType.COMPONENT,
        description: "Discord+ team tools",
        component: AdminPanel
    }
});
