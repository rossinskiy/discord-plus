/*
 * Vencord, a Discord client mod
 * Copyright (c) 2026 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

export interface VoiceInfo {
    id: string;
    name: string;
    guildName: string;
    /** People in the channel right now. */
    count: number;
    /** 0 means no limit. */
    limit: number;
}

/** True when a channel has a limit and every slot is taken. */
export function isFull(v: Pick<VoiceInfo, "count" | "limit">): boolean {
    return v.limit > 0 && v.count >= v.limit;
}

/**
 * Voice channels whose name or server name contains the text, ignoring case. Channels with people
 * in them come first, the busiest on top, then the rest by server and name. An empty text matches all.
 */
export function rankVoice(list: VoiceInfo[], query: string): VoiceInfo[] {
    const q = query.trim().toLowerCase();
    return list
        .filter(v => !q || v.name.toLowerCase().includes(q) || v.guildName.toLowerCase().includes(q))
        .sort((a, b) => b.count - a.count || a.guildName.localeCompare(b.guildName) || a.name.localeCompare(b.name));
}
