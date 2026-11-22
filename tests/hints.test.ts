/*
 * Vencord, a Discord client mod
 * Copyright (c) 2026 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import assert from "node:assert/strict";
import { test } from "node:test";

import { hintLabels, matching } from "../src/plugins/vimium/hints";

test("few targets get single letters", () => {
    assert.deepEqual(hintLabels(3, "asdf"), ["a", "s", "d"]);
});

test("more targets than letters get two letters, all the same length and unique", () => {
    const labels = hintLabels(10, "asdf");
    assert.equal(labels.length, 10);
    assert.ok(labels.every(l => l.length === 2));
    assert.equal(new Set(labels).size, 10);
});

test("no label is the start of another", () => {
    const labels = hintLabels(40, "asdfghjkl");
    for (const a of labels) for (const b of labels) if (a !== b) assert.ok(!b.startsWith(a));
});

test("repeated letters in the alphabet are ignored and bad input gives nothing", () => {
    assert.deepEqual(hintLabels(2, "aab"), ["a", "b"]);
    assert.deepEqual(hintLabels(5, "a"), []);
    assert.deepEqual(hintLabels(0, "asdf"), []);
});

test("matching narrows as letters are typed", () => {
    const labels = hintLabels(10, "asdf");
    assert.equal(matching(labels, "").length, 10);
    assert.equal(matching(labels, labels[5].slice(0, 1)).length, 4);
    assert.deepEqual(matching(labels, labels[5]), [5]);
    assert.deepEqual(matching(labels, "zz"), []);
});
