/*
 * Vencord, a Discord client mod
 * Copyright (c) 2026 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import assert from "node:assert/strict";
import { test } from "node:test";

import { accountAgeDays, createdAt } from "../src/plugins/newUserIndicator/accountAge";

// Discord's own documented example: 175928847299117063 was created at 2016-04-30 11:18:25.796 UTC
test("createdAt decodes a known snowflake", () => {
    assert.equal(createdAt("175928847299117063"), Date.UTC(2016, 3, 30, 11, 18, 25, 796));
});

test("accountAgeDays counts whole days", () => {
    const created = createdAt("175928847299117063")!;
    assert.equal(accountAgeDays("175928847299117063", created + 3 * 86_400_000 + 5_000), 3);
    assert.equal(accountAgeDays("175928847299117063", created + 1000), 0);
});

test("a bad id gives null", () => {
    assert.equal(createdAt("abc"), null);
    assert.equal(accountAgeDays("", Date.now()), null);
});
