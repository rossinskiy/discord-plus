/*
 * Vencord, a Discord client mod
 * Copyright (c) 2026 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import assert from "node:assert/strict";
import { test } from "node:test";

import { splitMessage } from "../src/plugins/longMsgTxt/split";

test("a short message stays whole", () => {
    assert.deepEqual(splitMessage("hello there", 100), ["hello there"]);
});

test("every piece fits and no text is lost", () => {
    const text = Array.from({ length: 60 }, (_, i) => `word${i}`).join(" ");
    const pieces = splitMessage(text, 50);
    assert.ok(pieces.length > 1);
    assert.ok(pieces.every(p => p.length <= 50));
    assert.equal(pieces.join(""), text);
});

test("prefers cutting at line breaks", () => {
    const text = "a".repeat(30) + "\n" + "b".repeat(30);
    const pieces = splitMessage(text, 45);
    assert.deepEqual(pieces, ["a".repeat(30) + "\n", "b".repeat(30)]);
});

test("one huge word is cut hard", () => {
    const pieces = splitMessage("x".repeat(95), 30);
    assert.ok(pieces.every(p => p.length <= 30));
    assert.equal(pieces.join(""), "x".repeat(95));
});

test("a code block cut in the middle is closed and reopened", () => {
    const code = Array.from({ length: 12 }, (_, i) => `line${i}();`).join("\n");
    const pieces = splitMessage("```js\n" + code + "\n```", 60);
    assert.ok(pieces.length > 1);
    assert.ok(pieces.every(p => p.length <= 60));
    for (const p of pieces) assert.equal((p.match(/```/g) ?? []).length % 2, 0, `unbalanced fence in: ${p}`);
    assert.ok(pieces[1].startsWith("```js\n"));
});

test("a tiny limit is refused", () => {
    assert.throws(() => splitMessage("abc", 5));
});
