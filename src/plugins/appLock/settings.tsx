/*
 * Vencord, a Discord client mod
 * Copyright (c) 2026 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { definePluginSettings } from "@api/Settings";
import { Button } from "@components/Button";
import { OptionType } from "@utils/types";
import { Forms, useEffect, useState } from "@webpack/common";

import { checkPassword, hasPassword, removePassword, setPassword } from "./lock";

function PasswordSetup() {
    const [has, setHas] = useState<boolean | null>(null);
    const [current, setCurrent] = useState("");
    const [next, setNext] = useState("");
    const [again, setAgain] = useState("");
    const [msg, setMsg] = useState("");

    useEffect(() => { hasPassword().then(setHas); }, []);
    if (has === null) return null;

    async function save() {
        if (has && !(await checkPassword(current))) return setMsg("The current password is wrong.");
        if (next.length < 4) return setMsg("Use at least 4 characters.");
        if (next !== again) return setMsg("The two new passwords are different.");
        await setPassword(next);
        setHas(true);
        setCurrent(""); setNext(""); setAgain("");
        setMsg("Password saved. It is asked the next time Discord starts or locks.");
    }

    async function remove() {
        if (!(await checkPassword(current))) return setMsg("Type the current password first.");
        await removePassword();
        setHas(false);
        setCurrent("");
        setMsg("Password removed. Discord opens without one.");
    }

    return (
        <div className="vc-applock-settings">
            <Forms.FormText>
                {has ? "A password is set. To change or remove it, type the current one." : "No password yet. Set one to turn the lock on."}
            </Forms.FormText>
            {has && <input type="password" placeholder="Current password" aria-label="Current password" value={current} onChange={e => setCurrent(e.target.value)} />}
            <input type="password" placeholder="New password" aria-label="New password" value={next} onChange={e => setNext(e.target.value)} />
            <input type="password" placeholder="New password again" aria-label="New password again" value={again} onChange={e => setAgain(e.target.value)} />
            <div style={{ display: "flex", gap: 8 }}>
                <Button size="small" onClick={save}>{has ? "Change password" : "Set password"}</Button>
                {has && <Button size="small" variant="dangerSecondary" onClick={remove}>Remove password</Button>}
            </div>
            <span className="vc-applock-msg" role="status">{msg}</span>
        </div>
    );
}

export const settings = definePluginSettings({
    password: {
        type: OptionType.COMPONENT,
        component: PasswordSetup
    },
    lockHotkey: {
        type: OptionType.STRING,
        description: "Press this to lock Discord at once, for example when someone walks up. Format: Ctrl+Alt+L. Leave empty for no hotkey.",
        default: "Ctrl+Alt+L"
    },
    idleMinutes: {
        type: OptionType.NUMBER,
        description: "Lock after this many minutes without touching the mouse or keyboard. 0 turns it off.",
        default: 0
    }
});
