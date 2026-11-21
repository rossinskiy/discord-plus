/*
 * Vencord, a Discord client mod
 * Copyright (c) 2026 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import assert from "node:assert/strict";
import { test } from "node:test";

import { isFull, rankVoice, VoiceInfo } from "../src/plugins/voiceChannelSearch/rank";

const v = (id: string, name: string, guildName: string, count: number, limit = 0): VoiceInfo => ({ id, name, guildName, count, limit });

const list = [
    v("1", "General", "Alpha", 0),
    v("2", "Gaming", "Beta", 3),
    v("3", "Chill", "Alpha", 1),
    v("4", "Gaming 2", "Alpha", 3)
];

test("busy channels come first, then by server and name", () => {
    assert.deepEqual(rankVoice(list, "").map(x => x.id), ["4", "2", "3", "1"]);
});

test("matches channel names and server names, ignoring case", () => {
    assert.deepEqual(rankVoice(list, "GAMING").map(x => x.id), ["4", "2"]);
    assert.deepEqual(rankVoice(list, "beta").map(x => x.id), ["2"]);
    assert.deepEqual(rankVoice(list, "zzz"), []);
});

test("isFull needs a limit and all slots taken", () => {
    assert.equal(isFull(v("a", "n", "g", 5, 5)), true);
    assert.equal(isFull(v("a", "n", "g", 4, 5)), false);
    assert.equal(isFull(v("a", "n", "g", 50, 0)), false);
});
