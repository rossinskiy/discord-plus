/*
 * Vencord, a Discord client mod
 * Copyright (c) 2026 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import assert from "node:assert/strict";
import { test } from "node:test";

import { hasRickroll } from "../src/plugins/antiRickroll/detect";

test("finds the video in common link shapes", () => {
    assert.equal(hasRickroll("look https://www.youtube.com/watch?v=dQw4w9WgXcQ"), true);
    assert.equal(hasRickroll("https://youtu.be/dQw4w9WgXcQ?t=43"), true);
    assert.equal(hasRickroll("https://m.youtube.com/watch?feature=share&v=dQw4w9WgXcQ"), true);
    assert.equal(hasRickroll("https://www.youtube.com/embed/dQw4w9WgXcQ"), true);
});

test("other videos and plain text are fine", () => {
    assert.equal(hasRickroll("https://www.youtube.com/watch?v=aaaaaaaaaaa"), false);
    assert.equal(hasRickroll("dQw4w9WgXcQ without a link"), false);
    assert.equal(hasRickroll("https://example.com/?v=dQw4w9WgXcQ"), false);
    assert.equal(hasRickroll(""), false);
});
