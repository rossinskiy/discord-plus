/*
 * Vencord, a Discord client mod
 * Copyright (c) 2026 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

export type QuestState = "claimed" | "claim-pending" | "expired" | "not-accepted" | "unsupported" | "working";

interface QuestLike {
    config?: { expiresAt?: string; };
    userStatus?: { enrolledAt?: string | null; completedAt?: string | null; claimedAt?: string | null; } | null;
}

/**
 * Where a quest stands, in the order that decides what AutoQuest can do with it.
 * "working" means AutoQuest will (or already does) run it, "not-accepted" means you have to accept it first.
 */
export function questState(q: QuestLike, supported: boolean, now = Date.now()): QuestState {
    const status = q.userStatus;
    if (status?.claimedAt) return "claimed";
    if (status?.completedAt) return "claim-pending";
    const expires = q.config?.expiresAt ? new Date(q.config.expiresAt).getTime() : Infinity;
    if (expires <= now) return "expired";
    if (!status?.enrolledAt) return "not-accepted";
    return supported ? "working" : "unsupported";
}

/** Quests worth listing: not claimed yet and not expired. */
export function isListed(state: QuestState): boolean {
    return state !== "claimed" && state !== "expired";
}
