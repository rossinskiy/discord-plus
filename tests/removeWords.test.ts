/*
 * Vencord, a Discord client mod
 * Copyright (c) 2026 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import assert from "node:assert/strict";
import { test } from "node:test";

import { removeWords } from "../src/plugins/profanityFilter/removeWords";

test("removes whole words, ignoring case", () => {
    assert.equal(removeWords("this is Darn good", ["darn"]), "this is good");
    assert.equal(removeWords("darn it, darn", ["darn"]), "it,");
});

test("does not touch words that only contain the listed one", () => {
    assert.equal(removeWords("a classy class", ["ass"]), "a classy class");
});

test("works with non latin words", () => {
    assert.equal(removeWords("это плохое слово тут", ["плохое"]), "это слово тут");
});

test("special characters in a word are taken literally", () => {
    assert.equal(removeWords("a c++ b", ["c++"]), "a b");
});

test("empty list or empty words change nothing", () => {
    assert.equal(removeWords("keep   spacing", []), "keep   spacing");
    assert.equal(removeWords("keep   spacing", ["", "  "]), "keep   spacing");
});

test("keeps other lines as they are", () => {
    assert.equal(removeWords("one  two\nbad here", ["bad"]), "one  two\nhere");
});
