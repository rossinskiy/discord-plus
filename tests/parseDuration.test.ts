/*
 * Vencord, a Discord client mod
 * Copyright (c) 2026 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import assert from "node:assert/strict";
import { test } from "node:test";

import { parseDuration } from "../src/plugins/reminders/parseDuration";

const MIN = 60_000;
const HOUR = 60 * MIN;
const DAY = 24 * HOUR;

test("single units", () => {
    assert.equal(parseDuration("10m"), 10 * MIN);
    assert.equal(parseDuration("2h"), 2 * HOUR);
    assert.equal(parseDuration("1d"), DAY);
    assert.equal(parseDuration("1w"), 7 * DAY);
    assert.equal(parseDuration("30s"), 30_000);
});

test("combined units add up", () => {
    assert.equal(parseDuration("2h30m"), 2 * HOUR + 30 * MIN);
    assert.equal(parseDuration("1d 2h"), DAY + 2 * HOUR);
});

test("a bare number means minutes", () => {
    assert.equal(parseDuration("90"), 90 * MIN);
});

test("written out units and decimals", () => {
    assert.equal(parseDuration("5 minutes"), 5 * MIN);
    assert.equal(parseDuration("2 hours"), 2 * HOUR);
    assert.equal(parseDuration("1.5h"), 90 * MIN);
});

test("case and surrounding spaces do not matter", () => {
    assert.equal(parseDuration("  10M "), 10 * MIN);
});

test("nonsense and zero give null", () => {
    assert.equal(parseDuration(""), null);
    assert.equal(parseDuration("   "), null);
    assert.equal(parseDuration("soon"), null);
    assert.equal(parseDuration("10x"), null);
    assert.equal(parseDuration("0m"), null);
});
