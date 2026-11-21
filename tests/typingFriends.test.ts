/*
 * Vencord, a Discord client mod
 * Copyright (c) 2026 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import assert from "node:assert/strict";
import { test } from "node:test";

import { prune, TYPING_TTL_MS, typingNow } from "../src/plugins/typingFriends/typing";

const NOW = 1_000_000;

test("lists people still within the typing window, newest first", () => {
    const records = new Map([
        ["a", { channelId: "c1", at: NOW - 2000 }],
        ["b", { channelId: "c2", at: NOW - 500 }],
        ["old", { channelId: "c3", at: NOW - TYPING_TTL_MS }]
    ]);
    assert.deepEqual(typingNow(records, NOW), [
        { userId: "b", channelId: "c2" },
        { userId: "a", channelId: "c1" }
    ]);
});

test("can be limited to a set of people", () => {
    const records = new Map([
        ["a", { channelId: "c1", at: NOW - 1000 }],
        ["b", { channelId: "c2", at: NOW - 1000 }]
    ]);
    assert.deepEqual(typingNow(records, NOW, new Set(["b"])), [{ userId: "b", channelId: "c2" }]);
});

test("prune removes expired records only", () => {
    const records = new Map([
        ["fresh", { channelId: "c", at: NOW - 1000 }],
        ["stale", { channelId: "c", at: NOW - 60_000 }]
    ]);
    prune(records, NOW);
    assert.deepEqual([...records.keys()], ["fresh"]);
});
