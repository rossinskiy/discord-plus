/*
 * Vencord, a Discord client mod
 * Copyright (c) 2026 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import assert from "node:assert/strict";
import { test } from "node:test";

import { add, Bookmark, excerpt, has, MAX_BOOKMARKS, messageLink, remove } from "../src/plugins/bookmarks/list";

const bm = (id: string, guildId: string | null = "g"): Bookmark => ({ messageId: id, channelId: "c", guildId, author: "a", text: "t", savedAt: 1 });

test("add puts the newest first and never saves a message twice", () => {
    let list = add([], bm("1"));
    list = add(list, bm("2"));
    list = add(list, bm("1"));
    assert.deepEqual(list.map(b => b.messageId), ["2", "1"]);
});

test("add keeps at most the limit, dropping the oldest", () => {
    let list: Bookmark[] = [];
    for (let i = 0; i < MAX_BOOKMARKS + 5; i++) list = add(list, bm(String(i)));
    assert.equal(list.length, MAX_BOOKMARKS);
    assert.equal(has(list, "0"), false);
    assert.equal(has(list, String(MAX_BOOKMARKS + 4)), true);
});

test("remove drops one message", () => {
    assert.deepEqual(remove([bm("1"), bm("2")], "1").map(b => b.messageId), ["2"]);
});

test("messageLink uses @me for direct messages", () => {
    assert.equal(messageLink(bm("5", "77")), "https://discord.com/channels/77/c/5");
    assert.equal(messageLink(bm("5", null)), "https://discord.com/channels/@me/c/5");
});

test("excerpt squashes whitespace and cuts long text", () => {
    assert.equal(excerpt("a \n\n b"), "a b");
    assert.equal(excerpt("x".repeat(100), 10), "xxxxxxx...");
});
