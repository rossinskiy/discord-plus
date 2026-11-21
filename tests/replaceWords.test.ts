/*
 * Vencord, a Discord client mod
 * Copyright (c) 2026 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import assert from "node:assert/strict";
import { test } from "node:test";

import { parseRules, replaceWords } from "../src/plugins/profanityFilter/replaceWords";

const rules = parseRules("fucking=freaking\nfuck=freak\nshit=shoot\ndarn");

test("parseRules reads word=replacement and lone words", () => {
    assert.deepEqual(parseRules("a=b\n c = d e \nlone\n=x\n\nempty="), [
        { word: "a", replacement: "b" },
        { word: "c", replacement: "d e" },
        { word: "lone", replacement: "" },
        { word: "empty", replacement: "" }
    ]);
});

test("swaps a word for its replacement", () => {
    assert.equal(replaceWords("o my fucking god", rules), "o my freaking god");
    assert.equal(replaceWords("what the fuck", rules), "what the freak");
});

test("keeps the capitals of the original", () => {
    assert.equal(replaceWords("Fuck this", rules), "Freak this");
    assert.equal(replaceWords("FUCKING hell", rules), "FREAKING hell");
    assert.equal(replaceWords("oh sHit", rules), "oh shoot");
});

test("does not touch words that only contain a listed one", () => {
    assert.equal(replaceWords("a classy class", parseRules("ass=butt")), "a classy class");
});

test("a word without a replacement is removed and spaces are tidied", () => {
    assert.equal(replaceWords("this is darn good", rules), "this is good");
    assert.equal(replaceWords("one  two\ndarn here", rules), "one  two\nhere");
});

test("works with non latin words and special characters", () => {
    assert.equal(replaceWords("это плохое слово", parseRules("плохое=хорошее")), "это хорошее слово");
    assert.equal(replaceWords("a c++ b", parseRules("c++=cpp")), "a cpp b");
});

test("no rules change nothing", () => {
    assert.equal(replaceWords("keep   spacing", []), "keep   spacing");
});
