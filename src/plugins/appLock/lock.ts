/*
 * Vencord, a Discord client mod
 * Copyright (c) 2026 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import * as DataStore from "@api/DataStore";
import type { PluginNative } from "@utils/types";

export const Native = VencordNative?.pluginHelpers?.AppLock as PluginNative<typeof import("./native")> | undefined;

const KEY = "AppLock_password";
const ITERATIONS = 200_000;

interface Stored { salt: string; hash: string; }

const toHex = (b: ArrayBuffer | Uint8Array) => [...new Uint8Array(b as ArrayBuffer)].map(x => x.toString(16).padStart(2, "0")).join("");
const fromHex = (s: string) => new Uint8Array((s.match(/../g) ?? []).map(h => parseInt(h, 16)));

async function derive(password: string, salt: Uint8Array) {
    const key = await crypto.subtle.importKey("raw", new TextEncoder().encode(password), "PBKDF2", false, ["deriveBits"]);
    return toHex(await crypto.subtle.deriveBits({ name: "PBKDF2", salt: salt as BufferSource, iterations: ITERATIONS, hash: "SHA-256" }, key, 256));
}

export async function hasPassword() {
    return (await DataStore.get<Stored>(KEY)) != null;
}

export async function setPassword(password: string) {
    const salt = crypto.getRandomValues(new Uint8Array(16));
    await DataStore.set(KEY, { salt: toHex(salt), hash: await derive(password, salt) } satisfies Stored);
    Native?.setArmed(true);
}

export async function checkPassword(password: string) {
    const stored = await DataStore.get<Stored>(KEY);
    if (!stored) return true;
    const attempt = await derive(password, fromHex(stored.salt));
    // Constant-time comparison of two equal-length hex strings.
    let diff = attempt.length ^ stored.hash.length;
    for (let i = 0; i < attempt.length; i++) diff |= attempt.charCodeAt(i) ^ (stored.hash.charCodeAt(i) || 0);
    return diff === 0;
}

export async function removePassword() {
    await DataStore.del(KEY);
    Native?.setArmed(false);
}
