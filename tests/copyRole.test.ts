/*
 * Vencord, a Discord client mod
 * Copyright (c) 2026 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import assert from "node:assert/strict";
import { test } from "node:test";

import { copyRoleBody } from "../src/plugins/roleDuplication/copyRole";

test("copies the settings and sends permissions as a string", () => {
    const body = copyRoleBody({ name: "Mods", color: 255, hoist: true, mentionable: false, permissions: 8796093022208n }, "(copy)");
    assert.deepEqual(body, { name: "Mods (copy)", color: 255, hoist: true, mentionable: false, permissions: "8796093022208" });
});

test("a long name is cut to Discord's 100 character limit", () => {
    const body = copyRoleBody({ name: "x".repeat(100), color: 0, hoist: false, mentionable: false, permissions: 0n }, "(copy)");
    assert.equal(body.name.length, 100);
});
