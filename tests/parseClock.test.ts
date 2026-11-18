/*
 * Vencord, a Discord client mod
 * Copyright (c) 2026 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import assert from "node:assert/strict";
import { test } from "node:test";

import { parseClock } from "../src/plugins/scheduledMessages/parseClock";

// 2026-11-18 12:00 local time
const NOW = new Date(2026, 10, 18, 12, 0, 0, 0);
const at = (day: number, h: number, m = 0) => new Date(2026, 10, day, h, m, 0, 0).getTime();

test("a time later today stays today", () => {
    assert.equal(parseClock("18:30", NOW), at(18, 18, 30));
    assert.equal(parseClock("9", new Date(2026, 10, 18, 8, 0)), at(18, 9));
});

test("a time that already passed means tomorrow", () => {
    assert.equal(parseClock("09:15", NOW), at(19, 9, 15));
    assert.equal(parseClock("12:00", NOW), at(19, 12));
});

test("12 hour clock", () => {
    assert.equal(parseClock("6pm", NOW), at(18, 18));
    assert.equal(parseClock("6:30 PM", NOW), at(18, 18, 30));
    assert.equal(parseClock("12am", NOW), at(19, 0));
    assert.equal(parseClock("12pm", new Date(2026, 10, 18, 11, 0)), at(18, 12));
});

test("a dot works as a separator", () => {
    assert.equal(parseClock("18.30", NOW), at(18, 18, 30));
});

test("invalid text gives null", () => {
    assert.equal(parseClock("", NOW), null);
    assert.equal(parseClock("soon", NOW), null);
    assert.equal(parseClock("25:00", NOW), null);
    assert.equal(parseClock("10:75", NOW), null);
    assert.equal(parseClock("13pm", NOW), null);
    assert.equal(parseClock("0am", NOW), null);
});
