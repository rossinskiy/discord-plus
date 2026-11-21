/*
 * Vencord, a Discord client mod
 * Copyright (c) 2026 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import assert from "node:assert/strict";
import { test } from "node:test";

import { collectGifs, GIF_FORMAT_IMAGE, GIF_FORMAT_VIDEO } from "../src/plugins/saveUserGifs/collect";

const gifFile = (url: string) => ({ url, content_type: "image/gif", width: 10, height: 20 });

test("collects uploaded gifs and gif players from one author only", () => {
    const messages = [
        { author: { id: "me" }, attachments: [gifFile("https://x/a.gif"), { url: "https://x/b.png", content_type: "image/png" }] },
        { author: { id: "other" }, attachments: [gifFile("https://x/c.gif")] },
        { author: { id: "me" }, embeds: [{ type: "gifv", url: "https://tenor.com/view/1", video: { url: "https://t/1.mp4", width: 5, height: 6 } }] }
    ];
    assert.deepEqual(collectGifs(messages, "me"), [
        { url: "https://x/a.gif", src: "https://x/a.gif", width: 10, height: 20, format: GIF_FORMAT_IMAGE },
        { url: "https://tenor.com/view/1", src: "https://t/1.mp4", width: 5, height: 6, format: GIF_FORMAT_VIDEO }
    ]);
});

test("the same gif sent twice is collected once", () => {
    const m = { author: { id: "me" }, attachments: [gifFile("https://x/a.gif")] };
    assert.equal(collectGifs([m, m], "me").length, 1);
});

test("embeds that are not gif players are skipped", () => {
    const m = { author: { id: "me" }, embeds: [{ type: "link", url: "https://example.com" }, { type: "gifv", url: "https://tenor.com/x" }] };
    assert.deepEqual(collectGifs([m], "me"), []);
});

test("only the newest max gifs are kept", () => {
    const messages = Array.from({ length: 5 }, (_, i) => ({ author: { id: "me" }, attachments: [gifFile(`https://x/${i}.gif`)] }));
    assert.deepEqual(collectGifs(messages, "me", 2).map(g => g.url), ["https://x/3.gif", "https://x/4.gif"]);
});
