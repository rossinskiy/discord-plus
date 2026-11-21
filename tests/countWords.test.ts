/*
 * Vencord, a Discord client mod
 * Copyright (c) 2026 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import assert from "node:assert/strict";
import { test } from "node:test";

import { countWords } from "../src/plugins/wordCount/countWords";

test("counts plain words in any language", () => {
    assert.equal(countWords("hello big world"), 3);
    assert.equal(countWords("привет  как дела\nсегодня"), 4);
    assert.equal(countWords(""), 0);
});

test("ignores code blocks, links, emoji and mentions", () => {
    assert.equal(countWords("look ```const a = 1;``` here"), 2);
    assert.equal(countWords("see https://example.com now"), 2);
    assert.equal(countWords("<@123> hi <:smile:456> there <t:1700000000:R>"), 2);
});

test("lone punctuation is not a word", () => {
    assert.equal(countWords("a - b ... c"), 3);
});
