/*
 * Vencord, a Discord client mod
 * Copyright (c) 2026 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import assert from "node:assert/strict";
import { test } from "node:test";

import { dayKey, formatDuration, lastDays, prune } from "../src/plugins/wellbeing/usage";

const NOW = new Date(2026, 10, 20, 15, 0).getTime();

test("dayKey is the local calendar date", () => {
    assert.equal(dayKey(NOW), "2026-11-20");
    assert.equal(dayKey(new Date(2026, 0, 5, 23, 59).getTime()), "2026-01-05");
});

test("lastDays lists days oldest first with zeros for gaps", () => {
    const usage = { "2026-11-20": 600, "2026-11-18": 120 };
    assert.deepEqual(lastDays(usage, 4, NOW), [0, 120, 0, 600]);
});

test("formatDuration shows hours and minutes", () => {
    assert.equal(formatDuration(0), "0 min");
    assert.equal(formatDuration(35 * 60), "35 min");
    assert.equal(formatDuration(2 * 3600 + 5 * 60), "2 h 05 min");
    assert.equal(formatDuration(3600, "ч", "мин"), "1 ч 00 мин");
});

test("prune keeps the newest days", () => {
    const usage = { "2026-11-01": 1, "2026-11-02": 2, "2026-11-03": 3 };
    assert.deepEqual(prune(usage, 2), { "2026-11-02": 2, "2026-11-03": 3 });
});
