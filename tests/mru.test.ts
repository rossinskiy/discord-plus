/*
 * Vencord, a Discord client mod
 * Copyright (c) 2026 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import assert from "node:assert/strict";
import { test } from "node:test";

import { stepBack, visit } from "../src/plugins/recentChannelSwitcher/mru";

const c = (id: string) => ({ channelId: id, guildId: "g" });

test("visit moves a channel to the front without duplicates", () => {
    let list = visit([], c("a"));
    list = visit(list, c("b"));
    list = visit(list, c("c"));
    list = visit(list, c("a"));
    assert.deepEqual(list.map(v => v.channelId), ["a", "c", "b"]);
});

test("visit keeps at most max entries", () => {
    let list: ReturnType<typeof visit> = [];
    for (const id of ["a", "b", "c", "d"]) list = visit(list, c(id), 3);
    assert.deepEqual(list.map(v => v.channelId), ["d", "c", "b"]);
});

test("stepBack goes back and wraps around", () => {
    const list = [c("a"), c("b"), c("c")];
    assert.equal(stepBack(list, 1)?.channelId, "b");
    assert.equal(stepBack(list, 2)?.channelId, "c");
    assert.equal(stepBack(list, 3)?.channelId, "a");
});

test("stepBack has nowhere to go with fewer than two channels", () => {
    assert.equal(stepBack([], 1), null);
    assert.equal(stepBack([c("a")], 1), null);
});
