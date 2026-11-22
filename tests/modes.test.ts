/*
 * Vencord, a Discord client mod
 * Copyright (c) 2026 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import assert from "node:assert/strict";
import { test } from "node:test";

import { cleanModeName, diffModes } from "../src/plugins/modes/diff";

const switchable = new Set(["A", "B", "C", "D"]);

test("enables what the mode wants and disables what it does not", () => {
    assert.deepEqual(diffModes(["A", "B"], ["B", "C"], switchable), { enable: ["C"], disable: ["A"] });
});

test("plugins that cannot be switched live are never touched", () => {
    assert.deepEqual(diffModes(["A", "Locked"], ["Other"], switchable), { enable: [], disable: ["A"] });
});

test("the same set changes nothing", () => {
    assert.deepEqual(diffModes(["A", "B"], ["B", "A"], switchable), { enable: [], disable: [] });
});

test("mode names", () => {
    assert.equal(cleanModeName("  Work   mode "), "Work mode");
    assert.equal(cleanModeName("Игры"), "Игры");
    assert.equal(cleanModeName(""), null);
    assert.equal(cleanModeName("a".repeat(31)), null);
    assert.equal(cleanModeName("bad/name"), null);
});
