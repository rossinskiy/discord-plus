/*
 * Vencord, a Discord client mod
 * Copyright (c) 2026 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import assert from "node:assert/strict";
import { test } from "node:test";

import { sparkline } from "../src/plugins/personalStats/sparkline";

test("nothing to draw gives an empty string", () => {
    assert.equal(sparkline([]), "");
    assert.equal(sparkline([0, 0, 0]), "");
});

test("one bar per value", () => {
    assert.equal(sparkline([1, 2, 3, 4]).length, 4);
});

test("the biggest value is the tallest bar and zero the lowest", () => {
    assert.equal(sparkline([0, 10]), "▁█");
});

test("a small non-zero value is never drawn as zero", () => {
    const [low, high] = sparkline([1, 1000]);
    assert.notEqual(low, "▁");
    assert.equal(high, "█");
});

test("equal values give equal bars", () => {
    assert.equal(sparkline([5, 5, 5]), "███");
});
