/*
 * Vencord, a Discord client mod
 * Copyright (c) 2026 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import assert from "node:assert/strict";
import { test } from "node:test";

import { staleEntries, trackedDays } from "../src/plugins/serverPruner/stale";

const DAY = 86_400_000;
const NOW = 100 * DAY;

test("trackedDays counts whole days", () => {
    assert.equal(trackedDays(NOW - 3 * DAY - 1000, NOW), 3);
    assert.equal(trackedDays(NOW + DAY, NOW), 0);
});

test("returns null until the plugin has watched long enough", () => {
    assert.equal(staleEntries(["a"], {}, NOW - 10 * DAY, 30, NOW), null);
});

test("lists ids quiet for the given days, longest first", () => {
    const since = NOW - 90 * DAY;
    const last = { a: NOW - 5 * DAY, b: NOW - 45 * DAY, c: NOW - 60 * DAY };
    assert.deepEqual(staleEntries(["a", "b", "c"], last, since, 30, NOW), [
        { id: "c", days: 60 },
        { id: "b", days: 45 }
    ]);
});

test("an id with no record counts from when watching started", () => {
    const since = NOW - 40 * DAY;
    assert.deepEqual(staleEntries(["x"], {}, since, 30, NOW), [{ id: "x", days: 40 }]);
});
