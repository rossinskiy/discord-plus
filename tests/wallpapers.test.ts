/*
 * Vencord, a Discord client mod
 * Copyright (c) 2026 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import assert from "node:assert/strict";
import { test } from "node:test";

import { cleanUrl, cssUrl, setWallpaper } from "../src/plugins/channelWallpaper/wallpapers";

test("only https addresses are accepted", () => {
    assert.equal(cleanUrl(" https://example.com/a.png "), "https://example.com/a.png");
    assert.equal(cleanUrl("http://example.com/a.png"), null);
    assert.equal(cleanUrl("javascript:alert(1)"), null);
    assert.equal(cleanUrl("file:///C:/secret.png"), null);
    assert.equal(cleanUrl("not a url"), null);
});

test("cssUrl escapes characters that could break out of url()", () => {
    assert.equal(cssUrl("https://x/a.png"), "url(\"https://x/a.png\")");
    assert.ok(!cssUrl("https://x/a\".png").slice(5, -2).includes("\""));
    assert.ok(!cssUrl("https://x/a\\b.png").slice(5, -2).includes("\\"));
});

test("setWallpaper adds, replaces and removes without changing the original", () => {
    const a = {};
    const b = setWallpaper(a, "1", "https://x/1.png");
    const c = setWallpaper(b, "1", "https://x/2.png");
    const d = setWallpaper(c, "1", null);
    assert.deepEqual(a, {});
    assert.deepEqual(b, { 1: "https://x/1.png" });
    assert.deepEqual(c, { 1: "https://x/2.png" });
    assert.deepEqual(d, {});
});
