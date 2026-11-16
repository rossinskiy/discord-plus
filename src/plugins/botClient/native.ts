/*
 * Vencord, a Discord client mod
 * Copyright (c) 2026 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { app, session } from "electron";

/*
 * Discord's API rejects bot tokens sent with a browser identity ("403 internal network error").
 * DiscordBotClient solved this with a local proxy; here the main process rewrites the headers of
 * requests that carry "Authorization: Bot ..." so they look like a normal bot library, and
 * patches the CORS headers of the answer so the renderer may read it. Other requests are untouched.
 */
const USER_AGENT = "DiscordBot (https://github.com/aiko-chan-ai/DiscordBotClient, v1)";
const STRIP = /^(origin|referer|cookie|sec-.*|x-super-properties|x-discord-.*|x-debug-options)$/i;
const FILTER = { urls: ["https://*.discord.com/api/*", "https://discord.com/api/*"] };

const botRequests = new Set<number>();

app.whenReady().then(() => {
    const { webRequest } = session.defaultSession;

    webRequest.onBeforeSendHeaders(FILTER, (details, callback) => {
        const headers = details.requestHeaders;
        const auth = Object.entries(headers).find(([k]) => k.toLowerCase() === "authorization")?.[1];
        if (typeof auth !== "string" || !/^bot /i.test(auth)) return callback({ requestHeaders: headers });
        botRequests.add(details.id);
        for (const key of Object.keys(headers)) if (STRIP.test(key)) delete headers[key];
        headers["User-Agent"] = USER_AGENT;
        callback({ requestHeaders: headers });
    });

    webRequest.onHeadersReceived(FILTER, (details, callback) => {
        if (!botRequests.delete(details.id)) return callback({ responseHeaders: details.responseHeaders });
        const headers = details.responseHeaders ?? {};
        for (const key of Object.keys(headers)) if (/^access-control-/i.test(key)) delete headers[key];
        headers["Access-Control-Allow-Origin"] = ["https://discord.com"];
        headers["Access-Control-Allow-Headers"] = ["*"];
        headers["Access-Control-Allow-Methods"] = ["GET, POST, PUT, PATCH, DELETE, OPTIONS"];
        callback({ responseHeaders: headers });
    });
});
