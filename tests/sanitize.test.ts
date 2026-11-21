/*
 * Vencord, a Discord client mod
 * Copyright (c) 2026 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import assert from "node:assert/strict";
import { test } from "node:test";

import { sanitize } from "../src/plugins/zeroWidthSanitizer/sanitize";

test("removes zero width spaces and similar", () => {
    assert.equal(sanitize("he​ll⁠o﻿"), "hello");
});

test("removes a joiner that is not part of an emoji", () => {
    assert.equal(sanitize("a‍b"), "ab");
});

test("keeps emoji sequences intact", () => {
    const family = "👨‍👩‍👧";
    assert.equal(sanitize(family), family);
    const heart = "❤️‍🔥";
    assert.equal(sanitize(heart), heart);
});

test("keeps the non-joiner used by Persian text", () => {
    const word = "می‌خواهم";
    assert.equal(sanitize(word), word);
});

test("plain text is unchanged", () => {
    assert.equal(sanitize("просто текст"), "просто текст");
});
