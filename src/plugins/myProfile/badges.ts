/*
 * Vencord, a Discord client mod
 * Copyright (c) 2026 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import * as DataStore from "@api/DataStore";
import type { PluginNative } from "@utils/types";

import { BADGE_ICONS, UID_ICONS } from "./badgeIcons";

const Native = VencordNative?.pluginHelpers?.MyProfile as PluginNative<typeof import("./native")> | undefined;

export const nativeAvailable = () => !!Native;

export interface OfficialBadge {
    id: string;
    name: string;
    description: string;
    icon: string;
}

// The only badges other people can ever see. They are handed out by the server
// owner, so nobody can claim one for themselves. The ids must match the server.
export const OFFICIAL_BADGES: OfficialBadge[] = [
    { id: "dev", name: "Discord+ Dev", description: "Discord+ Dev", icon: BADGE_ICONS.dev },
    { id: "tester", name: "Discord+ Tester", description: "Discord+ Tester", icon: BADGE_ICONS.tester },
    { id: "supporter", name: "Discord+ Supporter", description: "Discord+ Supporter", icon: BADGE_ICONS.supporter },
    { id: "founder", name: "Discord+ Founder", description: "Discord+ Founder", icon: BADGE_ICONS.founder },
    { id: "bughunter", name: "Discord+ Bug Hunter", description: "Discord+ Bug Hunter", icon: BADGE_ICONS.bughunter },
    { id: "artist", name: "Discord+ Artist", description: "Discord+ Artist", icon: BADGE_ICONS.artist }
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
const cache = new Map<string, { ids: string[]; uid?: number; joined?: number; at: number; }>();
const queue = new Set<string>();
let flushTimer: ReturnType<typeof setTimeout> | undefined;
let serverUrl = "";
let enabled = false;

export function configureRemote(url: string, on: boolean) {
    serverUrl = url.replace(/\/+$/, "");
    enabled = on;
}

export function cachedProfile(userId: string): { ids: string[]; uid?: number; joined?: number; } {
    const hit = cache.get(userId);
    if (!hit || Date.now() - hit.at > CACHE_MS) {
        requestBadges([userId]);
        return hit ?? { ids: [] };
    }
    return hit;
}

export const cachedOfficialBadges = (userId: string) => cachedProfile(userId).ids;

export function uidTier(uid: number) {
    return uid <= 100 ? "og" : uid <= 1000 ? "early" : "member";
}

export function uidBadgeInfo(uid: number, joined?: number) {
    const tier = uidTier(uid);
    const since = joined
        ? new Date(joined).toLocaleDateString(undefined, { year: "numeric", month: "long", day: "numeric" })
        : "";
    const days = joined ? Math.max(0, Math.floor((Date.now() - joined) / 86_400_000)) : 0;
    const title = tier === "og" ? "Discord+ OG" : tier === "early" ? "Early Discord+ user" : "Discord+ user";
    return {
        icon: UID_ICONS[tier],
        description: `${title} #${uid}${since ? `, since ${since}` : ""}${joined ? ` (${days === 0 ? "joined today" : `${days} day${days === 1 ? "" : "s"}`})` : ""}`
    };
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
        const res = await Native!.request(serverUrl, `/api/profiles?ids=${batch.join(",")}`, "GET");
        if (res.status === 200) {
            const data = JSON.parse(res.body) as Record<string, { badges?: string[]; uid?: number; joined?: number; }>;
            const now = Date.now();
            for (const id of batch) {
                const p = data[id];
                cache.set(id, { ids: (p?.badges ?? []).filter(b => officialById(b)), uid: p?.uid, joined: p?.joined, at: now });
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

// Your own place on the Discord+ user list.
export interface SelfInfo {
    userId: string;
    uid: number;
    joined: number;
}

const SELF_KEY = "MyProfile_self";
export let mySelf: SelfInfo | null = null;
let registering = false;

export async function loadSelf() {
    mySelf = (await DataStore.get<SelfInfo>(SELF_KEY)) ?? null;
    emit();
}

// Tells the server this account uses Discord+, once. Gets the member number back.
export async function registerSelf(userId: string) {
    if (!Native || !serverUrl || !userId || registering) return;
    if (mySelf?.userId === userId) return;

    registering = true;
    try {
        const res = await Native.request(serverUrl, "/api/register", "POST", undefined, JSON.stringify({ userId }));
        if (res.status === 200) {
            const data = JSON.parse(res.body) as { uid: number; joined: number; };
            mySelf = { userId, uid: data.uid, joined: data.joined };
            await DataStore.set(SELF_KEY, mySelf);
            cache.delete(userId);
            emit();
        }
    } catch { } finally {
        registering = false;
    }
}

export const selfInfoSince = () => mySelf;
