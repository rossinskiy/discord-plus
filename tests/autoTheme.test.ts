/*
 * Vencord, a Discord client mod
 * Copyright (c) 2026 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import assert from "node:assert/strict";
import { test } from "node:test";

import { desiredTheme } from "../src/plugins/autoThemeSwitcher/theme";

const at = (h: number, m = 0) => h * 60 + m;

test("light during the day, dark at night", () => {
    assert.equal(desiredTheme(at(12), "07:00", "20:00"), "light");
    assert.equal(desiredTheme(at(7), "07:00", "20:00"), "light");
    assert.equal(desiredTheme(at(19, 59), "07:00", "20:00"), "light");
    assert.equal(desiredTheme(at(20), "07:00", "20:00"), "dark");
    assert.equal(desiredTheme(at(3), "07:00", "20:00"), "dark");
});

test("a day that wraps midnight works too", () => {
    assert.equal(desiredTheme(at(2), "22:00", "06:00"), "light");
    assert.equal(desiredTheme(at(12), "22:00", "06:00"), "dark");
});

test("bad or equal times give null", () => {
    assert.equal(desiredTheme(at(12), "nope", "20:00"), null);
    assert.equal(desiredTheme(at(12), "07:00", "07:00"), null);
});
