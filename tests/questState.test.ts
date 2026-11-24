/*
 * Vencord, a Discord client mod
 * Copyright (c) 2026 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import assert from "node:assert/strict";
import { test } from "node:test";

import { isListed, questState } from "../src/plugins/autoQuest/state";

const NOW = Date.parse("2026-11-23T12:00:00Z");
const future = "2026-12-07T00:00:00Z";
const past = "2026-11-01T00:00:00Z";

test("a claimed quest is claimed, whatever else is set", () => {
    assert.equal(questState({ config: { expiresAt: past }, userStatus: { enrolledAt: "x", completedAt: "x", claimedAt: "x" } }, true, NOW), "claimed");
});

test("a completed quest waits for its claim", () => {
    assert.equal(questState({ config: { expiresAt: future }, userStatus: { enrolledAt: "x", completedAt: "x" } }, true, NOW), "claim-pending");
});

test("an expired quest is expired", () => {
    assert.equal(questState({ config: { expiresAt: past }, userStatus: { enrolledAt: "x" } }, true, NOW), "expired");
});

test("a quest nobody accepted is not accepted, even when it is supported", () => {
    assert.equal(questState({ config: { expiresAt: future }, userStatus: null }, true, NOW), "not-accepted");
    assert.equal(questState({ config: { expiresAt: future }, userStatus: {} }, true, NOW), "not-accepted");
});

test("an accepted quest is working when supported, unsupported when not", () => {
    const q = { config: { expiresAt: future }, userStatus: { enrolledAt: "2026-11-22T00:00:00Z" } };
    assert.equal(questState(q, true, NOW), "working");
    assert.equal(questState(q, false, NOW), "unsupported");
});

test("a quest with no end date never expires", () => {
    assert.equal(questState({ userStatus: { enrolledAt: "x" } }, true, NOW), "working");
});

test("claimed and expired quests are not listed", () => {
    assert.equal(isListed("claimed"), false);
    assert.equal(isListed("expired"), false);
    assert.equal(isListed("not-accepted"), true);
    assert.equal(isListed("claim-pending"), true);
});
