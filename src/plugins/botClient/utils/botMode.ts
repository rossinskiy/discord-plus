/*
 * Vencord, a Discord client mod
 * Copyright (c) 2026 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { localStorage } from "@utils/localStorage";
import { findByPropsLazy } from "@webpack";
import { RestAPI } from "@webpack/common";

import { blacklistedRoute, matchStub } from "./restStubs";

/*
 * "Bot mode" is the only switch that turns the plugin's behaviour on.
 * It is set when a token is submitted through the plugin's login box and cleared on logout,
 * so with the plugin enabled but no bot logged in, regular user sessions are left untouched.
 */
const KEY = "BotClient:botSession";
const TokenStore = findByPropsLazy("getToken", "getId", "getSessionId");

export const isBotMode = () => localStorage.getItem(KEY) === "1";

let onEnter: (() => void) | undefined;
export function setBotModeEnterHook(fn: (() => void) | undefined) {
    onEnter = fn;
}

export function enterBotMode() {
    localStorage.setItem(KEY, "1");
    onEnter?.();
}

export function leaveBotMode() {
    localStorage.removeItem(KEY);
}

const API_RE = /^(?:https:\/\/(?:[a-z]+\.)?discord\.com)?\/api\/v\d+\//;

// Discord sends the bare token; the REST API wants "Bot <token>" for bot accounts
function fixAuthorization(value: string) {
    if (!isBotMode() || /^bot /i.test(value)) return value;
    try {
        if (value === TokenStore.getToken()) return `Bot ${value}`;
    } catch { /* store not ready */ }
    return value;
}

let hooked = false;

export function installHttpHooks() {
    if (hooked) return;
    hooked = true;

    const xhrProto = XMLHttpRequest.prototype;
    const setHeader = xhrProto.setRequestHeader;
    const { open } = xhrProto;
    xhrProto.open = function (this: any, method: string, url: string | URL, ...rest: any[]) {
        this.__botClientApi = API_RE.test(String(url));
        return (open as any).call(this, method, url, ...rest);
    };
    xhrProto.setRequestHeader = function (this: any, name: string, value: string) {
        if (this.__botClientApi && name.toLowerCase() === "authorization") value = fixAuthorization(value);
        return setHeader.call(this, name, value);
    };

    const fetchOrig = window.fetch;
    window.fetch = function (this: any, input: any, init?: RequestInit) {
        try {
            const url = typeof input === "string" ? input : input?.url ?? String(input);
            if (isBotMode() && API_RE.test(url) && init?.headers) {
                const headers = new Headers(init.headers);
                const auth = headers.get("authorization");
                if (auth) {
                    headers.set("authorization", fixAuthorization(auth));
                    init = { ...init, headers };
                }
            }
        } catch { /* fall through to the untouched request */ }
        return fetchOrig.call(this, input, init);
    } as typeof fetch;

    // User-only endpoints do not exist for bots: answer them locally (see restStubs.ts)
    for (const method of ["get", "post", "put", "patch", "del"] as const) {
        const original = RestAPI[method].bind(RestAPI);
        RestAPI[method] = ((opts: any, ...rest: any[]) => {
            if (isBotMode() && opts && typeof opts.url === "string") {
                const path = opts.url.split("?")[0];
                const verb = method === "del" ? "DELETE" : method.toUpperCase();
                const stub = matchStub(path, verb);
                if (stub) return stub(opts, original).then(r => reply(r.status, r.body));
                if (blacklistedRoute(path)) {
                    return reply(403, { message: "BotClient: Bots cannot use this endpoint", code: 20001 });
                }
            }
            return (original as any)(opts, ...rest);
        }) as any;
    }
}

function reply(status: number, body: unknown): Promise<any> {
    const res = { ok: status >= 200 && status < 300, status, body, headers: {}, text: JSON.stringify(body ?? "") };
    return res.ok ? Promise.resolve(res) : Promise.reject(res);
}

const IntentBits = { GuildMembers: 1 << 1, GuildPresences: 1 << 8, MessageContent: 1 << 15 };
const AppFlags = {
    GatewayPresence: 1 << 12, GatewayPresenceLimited: 1 << 13,
    GatewayGuildMembers: 1 << 14, GatewayGuildMembersLimited: 1 << 15,
    GatewayMessageContent: 1 << 18, GatewayMessageContentLimited: 1 << 19,
};
// every non privileged intent (bits 0-16 except the privileged ones); same as DiscordBotClient's IntentsBitField.getIntents()
const ALL_INTENTS = (1 << 17) - 1 | (1 << 20) | (1 << 21) | (1 << 24) | (1 << 25);
const GUILDS_PER_SHARD = 1000;

/** Renderer replacement for BotClientNative.getBotInfo (was an Electron IPC call) */
export async function getBotInfo(rawToken: string): Promise<
    | { success: true; data: any; intents: number; allShards: number; }
    | { success: false; message: string; }
> {
    const token = rawToken.trim().replace(/^Bot\s+/i, "").trim();
    if (!token || token.length > 512) return { success: false, message: "Invalid bot token." };
    const headers = { Authorization: `Bot ${token}` };
    try {
        const [me, app] = await Promise.all([
            fetch("/api/v10/users/@me", { headers }),
            fetch("/api/v10/oauth2/applications/@me?with_counts=true", { headers }),
        ]);
        for (const res of [me, app]) {
            if (!res.ok) {
                const err = await res.json().catch(() => null) as { message?: string; } | null;
                return { success: false, message: `Discord API Error [${res.status}]: ${err?.message || res.statusText || "unknown"}` };
            }
        }
        const user = await me.json();
        if (!user.bot) return { success: false, message: "This token does not belong to a bot." };
        const data = await app.json();
        const flags: number = data.flags ?? 0;
        let intents = ALL_INTENTS | IntentBits.GuildMembers | IntentBits.GuildPresences | IntentBits.MessageContent;
        if (!(flags & (AppFlags.GatewayPresence | AppFlags.GatewayPresenceLimited))) intents &= ~IntentBits.GuildPresences;
        if (!(flags & (AppFlags.GatewayGuildMembers | AppFlags.GatewayGuildMembersLimited))) intents &= ~IntentBits.GuildMembers;
        if (!(flags & (AppFlags.GatewayMessageContent | AppFlags.GatewayMessageContentLimited))) intents &= ~IntentBits.MessageContent;
        const guilds = data.bot_approximate_guild_count ?? data.approximate_guild_count ?? 0;
        return { success: true, data, intents, allShards: Math.ceil(guilds / GUILDS_PER_SHARD) || 1 };
    } catch (e) {
        return { success: false, message: e instanceof Error ? e.message : String(e) };
    }
}
