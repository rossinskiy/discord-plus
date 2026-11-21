/*
 * Vencord, a Discord client mod
 * Copyright (c) 2026 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import assert from "node:assert/strict";
import { test } from "node:test";

import { isOwnStream } from "../src/plugins/streamProof/own";

test("a stream key that ends with my id is mine", () => {
    assert.equal(isOwnStream("guild:111:222:333", "333"), true);
    assert.equal(isOwnStream("call:222:333", "333"), true);
});

test("someone else's stream is not mine", () => {
    assert.equal(isOwnStream("guild:111:222:444", "333"), false);
});

test("an id that only ends with my digits does not count", () => {
    assert.equal(isOwnStream("call:222:1333", "333"), false);
});

test("missing values are never mine", () => {
    assert.equal(isOwnStream(undefined, "333"), false);
    assert.equal(isOwnStream("call:222:333", undefined), false);
    assert.equal(isOwnStream("", ""), false);
});
