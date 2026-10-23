/*
 * Vencord, a Discord client mod
 * Copyright (c) 2026 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { definePluginSettings } from "@api/Settings";
import { Button } from "@components/Button";
import { OptionType } from "@utils/types";
import { Forms, React, useEffect, UserStore, useState } from "@webpack/common";

import {
    addLocalBadge, adminRequest, clearBadgeCache, configureRemote, imageToBadge, localBadges, nativeAvailable, OFFICIAL_BADGES,
    removeLocalBadge, subscribe
} from "./badges";

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
    const me = UserStore.getCurrentUser()?.id ?? "";
    const [userId, setUserId] = useState(me);
    const [badge, setBadge] = useState(OFFICIAL_BADGES[0].id);
    const [status, setStatus] = useState("");
    const [token, setToken] = useState(settings.store.adminToken);

    async function run(action: "grant" | "revoke") {
        settings.store.adminToken = token;
        const res = await adminRequest(token, userId.trim(), badge, action);
        setStatus(res.message);
    }

    if (!nativeAvailable()) {
        return <Forms.FormText>Handing out badges works in the desktop app only.</Forms.FormText>;
    }

    return (
        <div className="vc-myprofile">
            <Forms.FormText>
                For the owner of the Discord+ server. Only a person with the admin token can give someone one of these
                badges, and everyone running Discord+ will see it on that person's profile.
            </Forms.FormText>
            <input
                className="vc-myprofile-input"
                type="password"
                placeholder="Admin token"
                value={token}
                autoComplete="off"
                onChange={e => setToken(e.target.value)}
            />
            <input
                className="vc-myprofile-input"
                placeholder="User ID (yours is filled in)"
                value={userId}
                onChange={e => setUserId(e.target.value)}
            />
            <div className="vc-myprofile-actions" role="group" aria-label="Badge to hand out">
                {OFFICIAL_BADGES.map(b => (
                    <Button key={b.id} size="small" variant={badge === b.id ? "primary" : "secondary"} onClick={() => setBadge(b.id)}>
                        <img src={b.icon} alt="" width={14} height={14} style={{ marginRight: 6, verticalAlign: "-2px" }} />
                        {b.name.replace("Discord+ ", "")}
                    </Button>
                ))}
            </div>
            <div className="vc-myprofile-actions">
                <Button size="small" onClick={() => run("grant")}>Give badge</Button>
                <Button size="small" variant="dangerSecondary" onClick={() => run("revoke")}>Take it back</Button>
            </div>
            {status && <span className="vc-myprofile-muted" role="status">{status}</span>}
        </div>
    );
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
        description: "Admin token (filled in from the panel below)",
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
        description: "Hand out Discord+ badges",
        component: AdminPanel
    }
});
