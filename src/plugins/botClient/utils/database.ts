/*
 * Vencord, a Discord client mod
 * Copyright (c) 2025 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { createStore, del, get, set } from "@api/DataStore";
import { Logger } from "@utils/Logger";

import {
    DefaultFrecencyUserSettings,
    DefaultPreloadedUserSettings,
    FrecencyUserSettings,
    PreloadedUserSettings,
} from "./proto";

const logger = new Logger("BotClient:Database", "#B3EBF2");

// Replaces the original Dexie database with Vencord's DataStore (IndexedDB), one key per bot
const store = createStore("BotClientData", "BotClient");

type DMs = Record<string, Record<string, any>>;

export class BotClientDatabase {
    // PrivateChannel methods
    async queryAllPrivateChannel(botId: string) {
        const dms = (await get<DMs>(`dms:${botId}`, store)) ?? {};
        return Object.entries(dms).map(([channelId, data]) => ({ botId, channelId, data }));
    }
    async handleOpenPrivateChannel(botId: string, userId: string, channelId: string) {
        logger.log("Opening private channel", { botId, userId, channelId });
        const dms = (await get<DMs>(`dms:${botId}`, store)) ?? {};
        dms[channelId] = {
            type: 1,
            recipients: [{ id: userId }],
            last_message_id: null,
            is_spam: false,
            id: channelId,
            flags: 0,
        };
        await set(`dms:${botId}`, dms, store);
    }
    async handleClosePrivateChannel(botId: string, channelId: string) {
        const dms = (await get<DMs>(`dms:${botId}`, store)) ?? {};
        delete dms[channelId];
        await set(`dms:${botId}`, dms, store);
    }
    clearDMsCache(botId: string) {
        return del(`dms:${botId}`, store);
    }
    // PreloadedUserSettings & FrecencyUserSettings methods
    async getPreloadedUserSettings(botId: string) {
        const v = await get<PreloadedUserSettings>(`preloaded:${botId}`, store);
        if (!v) return PreloadedUserSettings.create(DefaultPreloadedUserSettings);
        return PreloadedUserSettings.create(v);
    }
    async getFrecencyUserSettings(botId: string) {
        const v = await get<FrecencyUserSettings>(`frecency:${botId}`, store);
        if (!v) return FrecencyUserSettings.create(DefaultFrecencyUserSettings);
        return FrecencyUserSettings.create(v);
    }
    async SetPreloadedUserSettings(botId: string, settings: PreloadedUserSettings) {
        const normalized = PreloadedUserSettings.create(settings);
        PreloadedUserSettings.toBase64(normalized);
        await set(`preloaded:${botId}`, normalized, store);
    }
    async SetFrecencyUserSettings(botId: string, settings: FrecencyUserSettings) {
        const normalized = FrecencyUserSettings.create(settings);
        FrecencyUserSettings.toBase64(normalized);
        await set(`frecency:${botId}`, normalized, store);
    }
}

export default new BotClientDatabase();
