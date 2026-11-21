/*
 * Vencord, a Discord client mod
 * Copyright (c) 2026 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import assert from "node:assert/strict";
import { test } from "node:test";

import { emojiParam, tally } from "../src/plugins/reactionTracker/tally";

test("tally counts each user once per message and sorts by count", () => {
    const rows = tally([["a", "b", "a"], ["b"], ["b", "c"]]);
    assert.deepEqual(rows, [
        { userId: "b", count: 3 },
        { userId: "a", count: 1 },
        { userId: "c", count: 1 }
    ]);
});

test("tally of nothing is empty", () => {
    assert.deepEqual(tally([]), []);
});

test("emojiParam handles custom and plain emoji", () => {
    assert.equal(emojiParam("<:smile:123>"), encodeURIComponent("smile:123"));
    assert.equal(emojiParam("<a:dance:9>"), encodeURIComponent("dance:9"));
    assert.equal(emojiParam("👍"), encodeURIComponent("👍"));
    assert.equal(emojiParam("  "), null);
});
