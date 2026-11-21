/*
 * Vencord, a Discord client mod
 * Copyright (c) 2026 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import assert from "node:assert/strict";
import { test } from "node:test";

import { inWindow, parseHM } from "../src/plugins/quietHours/window";

test("parseHM reads 24 hour times", () => {
    assert.equal(parseHM("22:00"), 1320);
    assert.equal(parseHM(" 7:30 "), 450);
    assert.equal(parseHM("00:00"), 0);
});

test("parseHM rejects bad input", () => {
    assert.equal(parseHM(""), null);
    assert.equal(parseHM("24:00"), null);
    assert.equal(parseHM("10:60"), null);
    assert.equal(parseHM("10"), null);
});

test("a window in one day", () => {
    const start = parseHM("13:00")!, end = parseHM("15:00")!;
    assert.equal(inWindow(parseHM("12:59")!, start, end), false);
    assert.equal(inWindow(parseHM("13:00")!, start, end), true);
    assert.equal(inWindow(parseHM("14:59")!, start, end), true);
    assert.equal(inWindow(parseHM("15:00")!, start, end), false);
});

test("a window that crosses midnight", () => {
    const start = parseHM("22:00")!, end = parseHM("08:00")!;
    assert.equal(inWindow(parseHM("23:30")!, start, end), true);
    assert.equal(inWindow(parseHM("03:00")!, start, end), true);
    assert.equal(inWindow(parseHM("08:00")!, start, end), false);
    assert.equal(inWindow(parseHM("12:00")!, start, end), false);
});

test("equal start and end means never", () => {
    assert.equal(inWindow(600, 600, 600), false);
});
