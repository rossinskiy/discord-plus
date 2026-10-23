/*
 * Vencord, a Discord client mod
 * Copyright (c) 2026 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { IpcMainInvokeEvent } from "electron";

// All badge traffic goes through the main process, so it is not held back by the
// page's CSP or CORS, and it can only ever reach /api/ on the configured server.
export async function request(
    _: IpcMainInvokeEvent,
    base: string,
    path: string,
    method: "GET" | "POST",
    token?: string,
    body?: string
): Promise<{ status: number; body: string; }> {
    let url: URL;
    try {
        const origin = new URL(base);
        if (!path.startsWith("/api/") || path.startsWith("//")) return { status: -1, body: "bad path" };
        url = new URL(path, origin);
        if (url.origin !== origin.origin) return { status: -1, body: "bad path" };
        const local = url.hostname === "localhost" || url.hostname === "127.0.0.1";
        if (url.protocol !== "https:" && !(url.protocol === "http:" && local)) {
            return { status: -1, body: "the server address must be https" };
        }
    } catch {
        return { status: -1, body: "bad server address" };
    }

    try {
        const res = await fetch(url, {
            method,
            headers: {
                ...(token ? { Authorization: `Bearer ${token}` } : {}),
                ...(body ? { "Content-Type": "application/json" } : {})
            },
            body: method === "POST" ? body : undefined,
            signal: AbortSignal.timeout(8000)
        });
        return { status: res.status, body: (await res.text()).slice(0, 200_000) };
    } catch (e) {
        return { status: -1, body: String(e) };
    }
}
