/*
 * Vencord, a Discord client mod
 * Copyright (c) 2026 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import * as DataStore from "@api/DataStore";
import type { PluginNative } from "@utils/types";

const Native = VencordNative?.pluginHelpers?.MyProfile as PluginNative<typeof import("./native")> | undefined;

export const nativeAvailable = () => !!Native;

function icon(bg: string, path: string) {
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><circle cx="12" cy="12" r="12" fill="${bg}"/>${path}</svg>`;
    return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
}

export interface OfficialBadge {
    id: string;
    name: string;
    description: string;
    icon: string;
}

// The only badges other people can ever see. They are handed out by the server
// owner, so nobody can claim one for themselves. The ids must match the server.
export const OFFICIAL_BADGES: OfficialBadge[] = [
    { id: "dev", name: "Discord+ Dev", description: "Discord+ Dev", icon: icon("#16a34a", "<path d='M9.5 8 5.5 12l4 4M14.5 8l4 4-4 4' fill='none' stroke='#fff' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'/>") },
    { id: "tester", name: "Discord+ Tester", description: "Discord+ Tester", icon: icon("#2563eb", "<path d='M10 5h4M11 5v5l-4 7a1.6 1.6 0 0 0 1.4 2.4h7.2A1.6 1.6 0 0 0 17 17l-4-7V5' fill='none' stroke='#fff' stroke-width='1.8' stroke-linecap='round' stroke-linejoin='round'/>") },
    { id: "supporter", name: "Discord+ Supporter", description: "Discord+ Supporter", icon: icon("#db2777", "<path d='M12 18.5s-6-3.7-6-8A3.3 3.3 0 0 1 12 8.6a3.3 3.3 0 0 1 6 1.9c0 4.3-6 8-6 8z' fill='#fff'/>") },
    { id: "founder", name: "Discord+ Founder", description: "Discord+ Founder", icon: icon("#d97706", "<path d='m12 5 2.1 4.4 4.9.6-3.6 3.3 1 4.8L12 15.7 7.6 18l1-4.8L5 9.9l4.9-.6z' fill='#fff'/>") },
    { id: "bughunter", name: "Discord+ Bug Hunter", description: "Discord+ Bug Hunter", icon: icon("#7c3aed", "<circle cx='11' cy='11' r='4.2' fill='none' stroke='#fff' stroke-width='2'/><path d='m14.2 14.2 4 4' stroke='#fff' stroke-width='2' stroke-linecap='round'/>") },
    { id: "artist", name: "Discord+ Artist", description: "Discord+ Artist", icon: icon("#0891b2", "<path d='M12 5a7 7 0 1 0 0 14c1.2 0 1.7-.8 1.3-1.7-.5-1 .1-2.1 1.3-2.1H16a3 3 0 0 0 3-3A7 7 0 0 0 12 5z' fill='none' stroke='#fff' stroke-width='1.8'/><circle cx='9' cy='11' r='1' fill='#fff'/><circle cx='12' cy='8.8' r='1' fill='#fff'/><circle cx='15' cy='11' r='1' fill='#fff'/>") }
];

export const officialById = (id: string) => OFFICIAL_BADGES.find(b => b.id === id);

// Badges you made up yourself. They are drawn only on your own profile.
export interface LocalBadge {
    id: string;
    name: string;
    description: string;
    image: string;
    position: "start" | "end";
}

const LOCAL_KEY = "MyProfile_localBadges";
export let localBadges: LocalBadge[] = [];
const listeners = new Set<() => void>();

export function subscribe(fn: () => void) {
    listeners.add(fn);
    return () => { listeners.delete(fn); };
}

const emit = () => listeners.forEach(fn => fn());

export async function loadLocalBadges() {
    localBadges = (await DataStore.get<LocalBadge[]>(LOCAL_KEY)) ?? [];
    emit();
}

async function persist() {
    await DataStore.set(LOCAL_KEY, localBadges);
    emit();
}

export async function addLocalBadge(badge: Omit<LocalBadge, "id">) {
    localBadges = [...localBadges, { ...badge, id: `local-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}` }];
    await persist();
}

export async function removeLocalBadge(id: string) {
    localBadges = localBadges.filter(b => b.id !== id);
    await persist();
}

// Shrinks an uploaded picture to a small square so the save stays tiny.
export function imageToBadge(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
        const url = URL.createObjectURL(file);
        const img = new Image();
        img.onload = () => {
            const canvas = document.createElement("canvas");
            canvas.width = canvas.height = 64;
            const ctx = canvas.getContext("2d")!;
            const scale = Math.min(64 / img.width, 64 / img.height);
            const w = img.width * scale;
            const h = img.height * scale;
            ctx.drawImage(img, (64 - w) / 2, (64 - h) / 2, w, h);
            URL.revokeObjectURL(url);
            resolve(canvas.toDataURL("image/png"));
        };
        img.onerror = () => {
            URL.revokeObjectURL(url);
            reject(new Error("could not read that image"));
        };
        img.src = url;
    });
}

// What the server says about other people, cached for a while.
const CACHE_MS = 10 * 60_000;
const cache = new Map<string, { ids: string[]; at: number; }>();
const queue = new Set<string>();
let flushTimer: ReturnType<typeof setTimeout> | undefined;
let serverUrl = "";
let enabled = false;

export function configureRemote(url: string, on: boolean) {
    serverUrl = url.replace(/\/+$/, "");
    enabled = on;
}

export function cachedOfficialBadges(userId: string): string[] {
    const hit = cache.get(userId);
    if (!hit || Date.now() - hit.at > CACHE_MS) {
        requestBadges([userId]);
        return hit?.ids ?? [];
    }
    return hit.ids;
}

export function requestBadges(ids: string[]) {
    if (!enabled || !Native || !serverUrl) return;
    for (const id of ids) {
        if (!/^\d{5,25}$/.test(id)) continue;
        const hit = cache.get(id);
        if (hit && Date.now() - hit.at < CACHE_MS) continue;
        queue.add(id);
    }
    if (queue.size && !flushTimer) flushTimer = setTimeout(flush, 250);
}

async function flush() {
    flushTimer = undefined;
    const batch = [...queue].slice(0, 100);
    batch.forEach(id => queue.delete(id));
    if (!batch.length) return;

    try {
        const res = await Native!.request(serverUrl, `/api/badges?ids=${batch.join(",")}`, "GET");
        if (res.status === 200) {
            const data = JSON.parse(res.body) as Record<string, string[]>;
            const now = Date.now();
            for (const id of batch) {
                cache.set(id, { ids: (data[id] ?? []).filter(b => officialById(b)), at: now });
            }
            emit();
        }
    } catch { }

    if (queue.size) flushTimer = setTimeout(flush, 250);
}

export function clearBadgeCache() {
    cache.clear();
    queue.clear();
}

export interface ApiResult {
    status: number;
    json: any;
    error: string;
}

// Talks to the owner and moderator endpoints. The token only goes to the server you configured.
export async function adminCall(token: string, method: "GET" | "POST", path: string, body?: object): Promise<ApiResult> {
    if (!Native) return { status: -1, json: null, error: "This only works in the desktop app." };
    if (!serverUrl) return { status: -1, json: null, error: "Set the server address first." };
    if (!token) return { status: -1, json: null, error: "Enter your token first." };

    const res = await Native.request(serverUrl, path, method, token, body ? JSON.stringify(body) : undefined);
    let json: any = null;
    try { json = JSON.parse(res.body); } catch { }

    const error = res.status === 200 ? ""
        : res.status === -1 ? res.body
            : res.status === 401 ? "That token is not valid."
                : res.status === 404 ? "The server has no admin access set up."
                    : json?.error ?? `The server answered ${res.status}.`;
    return { status: res.status, json, error };
}

export function forgetBadges(userId: string) {
    cache.delete(userId);
    requestBadges([userId]);
}
