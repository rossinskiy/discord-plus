/*
 * Vencord, a Discord client mod
 * Copyright (c) 2026 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { Button } from "@components/Button";
import { Forms, UserStore, useState } from "@webpack/common";

import { adminCall, forgetBadges, nativeAvailable, OFFICIAL_BADGES } from "./badges";

interface Me {
    role: "owner" | "mod";
    id: string;
    lockdown: boolean;
    badges: string[];
    usage: { hour: number; day: number; hourLimit: number; dayLimit: number; } | null;
}

interface ModRow {
    id: string;
    createdAt: number;
    hour: number;
    day: number;
}

interface AuditRow {
    ts: number;
    actor: string;
    role?: string;
    action?: string;
    event?: string;
    userId?: string;
    badge?: string;
    count?: number;
}

const describe = (e: AuditRow) => {
    const when = new Date(e.ts).toLocaleString();
    if (e.action) return `${when}: ${e.actor === "owner" ? "owner" : `mod ${e.actor}`} ${e.action === "grant" ? "gave" : "took"} ${e.badge} ${e.action === "grant" ? "to" : "from"} ${e.userId}`;
    return `${when}: ${e.event}${e.userId ? ` ${e.userId}` : ""}${e.count !== undefined ? ` (${e.count} changes)` : ""}`;
};

export function StaffPanel({ token, setToken }: { token: string; setToken(t: string): void; }) {
    const [me, setMe] = useState<Me | null>(null);
    const [note, setNote] = useState("");
    const [userId, setUserId] = useState(UserStore.getCurrentUser()?.id ?? "");
    const [badge, setBadge] = useState("");
    const [mods, setMods] = useState<ModRow[]>([]);
    const [newMod, setNewMod] = useState("");
    const [shownToken, setShownToken] = useState<{ id: string; token: string; } | null>(null);
    const [log, setLog] = useState<AuditRow[]>([]);

    if (!nativeAvailable()) {
        return <Forms.FormText>Handing out badges works in the desktop app only.</Forms.FormText>;
    }

    async function connect() {
        setNote("");
        const res = await adminCall(token, "GET", "/api/admin/whoami");
        if (res.status !== 200) {
            setMe(null);
            return setNote(res.error);
        }
        setMe(res.json);
        setBadge(b => (res.json.badges.includes(b) ? b : res.json.badges[0] ?? ""));
        if (res.json.role === "owner") await refreshMods();
    }

    async function refreshMods() {
        const res = await adminCall(token, "GET", "/api/owner/mods");
        if (res.status === 200) setMods(res.json.mods);
    }

    async function change(action: "grant" | "revoke") {
        const res = await adminCall(token, "POST", "/api/admin/badges", { userId: userId.trim(), badge, action });
        if (res.status === 200) {
            forgetBadges(userId.trim());
            setNote(action === "grant" ? "Badge given." : "Badge taken away.");
        } else setNote(res.error);
        connect();
    }

    async function modAction(id: string, action: "add" | "remove" | "newtoken") {
        const res = await adminCall(token, "POST", "/api/owner/mods", { id, action });
        if (res.status !== 200) return setNote(res.error);
        if (res.json.token) setShownToken({ id, token: res.json.token });
        else setNote("Moderator removed. Their token stopped working right away.");
        refreshMods();
    }

    async function rollback(id: string) {
        const res = await adminCall(token, "POST", "/api/owner/rollback", { modId: id, hours: 24 });
        setNote(res.status === 200 ? `Undid ${res.json.undone} changes from the last 24 hours.` : res.error);
    }

    async function setLockdown(on: boolean) {
        const res = await adminCall(token, "POST", "/api/owner/lockdown", { on });
        setNote(res.status === 200 ? (on ? "All moderators are paused." : "Moderators can work again.") : res.error);
        connect();
    }

    async function showLog() {
        const res = await adminCall(token, "GET", "/api/owner/audit?limit=20");
        if (res.status === 200) setLog(res.json);
        else setNote(res.error);
    }

    return (
        <div className="vc-myprofile">
            <Forms.FormText>
                For the Discord+ team. Paste the token you were given (the owner has a master token, moderators get their own).
            </Forms.FormText>
            <div className="vc-myprofile-actions">
                <input
                    className="vc-myprofile-input"
                    type="password"
                    placeholder="Your token"
                    value={token}
                    autoComplete="off"
                    onChange={e => setToken(e.target.value)}
                    style={{ flex: 1 }}
                />
                <Button size="small" onClick={connect}>Connect</Button>
            </div>

            {me && (
                <>
                    <span className="vc-myprofile-muted">
                        You are the {me.role === "owner" ? "owner" : `moderator ${me.id}`}.
                        {me.usage && ` ${me.usage.hour}/${me.usage.hourLimit} changes this hour, ${me.usage.day}/${me.usage.dayLimit} today.`}
                        {me.lockdown && " All moderators are currently paused."}
                    </span>

                    <input
                        className="vc-myprofile-input"
                        placeholder="User ID to change"
                        value={userId}
                        onChange={e => setUserId(e.target.value)}
                    />
                    <div className="vc-myprofile-actions" role="group" aria-label="Badge to hand out">
                        {OFFICIAL_BADGES.filter(b => me.badges.includes(b.id)).map(b => (
                            <Button key={b.id} size="small" variant={badge === b.id ? "primary" : "secondary"} onClick={() => setBadge(b.id)}>
                                <img src={b.icon} alt="" width={14} height={14} style={{ marginRight: 6, verticalAlign: "-2px" }} />
                                {b.name.replace("Discord+ ", "")}
                            </Button>
                        ))}
                    </div>
                    <div className="vc-myprofile-actions">
                        <Button size="small" disabled={!badge} onClick={() => change("grant")}>Give badge</Button>
                        <Button size="small" variant="dangerSecondary" disabled={!badge} onClick={() => change("revoke")}>Take it away</Button>
                    </div>
                </>
            )}

            {me?.role === "owner" && (
                <>
                    <Forms.FormTitle tag="h5">Moderators</Forms.FormTitle>
                    <Forms.FormText>
                        Paste a Discord user ID to make that person a moderator. You get a token to send them, shown only once.
                        Moderators can hand out Tester, Supporter, Bug Hunter and Artist, up to 20 an hour. They cannot touch
                        staff, themselves, Dev or Founder badges. If moderators change 60 badges in an hour together, everyone
                        is paused until you lift it.
                    </Forms.FormText>
                    <div className="vc-myprofile-actions">
                        <input
                            className="vc-myprofile-input"
                            placeholder="Moderator's Discord user ID"
                            value={newMod}
                            onChange={e => setNewMod(e.target.value)}
                            style={{ flex: 1 }}
                        />
                        <Button size="small" disabled={!/^\d{5,25}$/.test(newMod.trim())} onClick={() => { modAction(newMod.trim(), "add"); setNewMod(""); }}>
                            Add moderator
                        </Button>
                    </div>

                    {shownToken && (
                        <div className="vc-myprofile-token">
                            <Forms.FormText>Token for {shownToken.id}. Send it privately. It will not be shown again.</Forms.FormText>
                            <code>{shownToken.token}</code>
                            <div className="vc-myprofile-actions">
                                <Button size="small" onClick={() => navigator.clipboard.writeText(shownToken.token)}>Copy</Button>
                                <Button size="small" variant="secondary" onClick={() => setShownToken(null)}>Done</Button>
                            </div>
                        </div>
                    )}

                    <div className="vc-myprofile-list">
                        {mods.length === 0 && <span className="vc-myprofile-muted">No moderators yet.</span>}
                        {mods.map(m => (
                            <div className="vc-myprofile-modrow" key={m.id}>
                                <span>{m.id} <span className="vc-myprofile-muted">{m.hour} this hour, {m.day} today</span></span>
                                <div className="vc-myprofile-actions">
                                    <Button size="small" variant="secondary" onClick={() => modAction(m.id, "newtoken")}>New token</Button>
                                    <Button size="small" variant="secondary" onClick={() => rollback(m.id)}>Undo last 24h</Button>
                                    <Button size="small" variant="dangerSecondary" onClick={() => modAction(m.id, "remove")}>Remove</Button>
                                </div>
                            </div>
                        ))}
                    </div>

                    <div className="vc-myprofile-actions">
                        <Button size="small" variant={me.lockdown ? "primary" : "dangerSecondary"} onClick={() => setLockdown(!me.lockdown)}>
                            {me.lockdown ? "Let moderators work again" : "Pause all moderators now"}
                        </Button>
                        <Button size="small" variant="secondary" onClick={showLog}>Show recent changes</Button>
                    </div>
                    {log.length > 0 && (
                        <ul className="vc-myprofile-log">
                            {log.map((e, i) => <li key={i}>{describe(e)}</li>)}
                        </ul>
                    )}
                </>
            )}

            {note && <span className="vc-myprofile-muted" role="status">{note}</span>}
        </div>
    );
}
