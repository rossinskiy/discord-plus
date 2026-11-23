/*
 * Vencord, a Discord client mod
 * Copyright (c) 2026 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import assert from "node:assert/strict";
import { test } from "node:test";

import { MIN_BETWEEN_RELOADS_MS, reloadReason, TrimSettings, TrimState } from "../src/plugins/memoryTrim/decide";

const MIN = 60_000;
const HOUR = 60 * MIN;
const cfg: TrimSettings = { heapLimitMB: 500, maxHours: 4, idleMinutes: 5 };
const base: TrimState = { heapMB: 100, pageUptimeMs: HOUR, unfocusedMs: 10 * MIN, inVoice: false, sinceLastReloadMs: Infinity };

test("a healthy page is left alone", () => {
    assert.equal(reloadReason(base, cfg), null);
});

test("a big heap triggers a reload when the window has been idle", () => {
    assert.equal(reloadReason({ ...base, heapMB: 600 }, cfg), "memory");
});

test("a page that ran too long triggers a reload", () => {
    assert.equal(reloadReason({ ...base, pageUptimeMs: 5 * HOUR }, cfg), "age");
});

test("memory wins when both reasons apply", () => {
    assert.equal(reloadReason({ ...base, heapMB: 900, pageUptimeMs: 9 * HOUR }, cfg), "memory");
});

test("never while you use the window or before the idle time has passed", () => {
    assert.equal(reloadReason({ ...base, heapMB: 900, unfocusedMs: 0 }, cfg), null);
    assert.equal(reloadReason({ ...base, heapMB: 900, unfocusedMs: 4 * MIN }, cfg), null);
});

test("never during a voice call or stream", () => {
    assert.equal(reloadReason({ ...base, heapMB: 900, inVoice: true }, cfg), null);
});

test("never twice in a short time", () => {
    assert.equal(reloadReason({ ...base, heapMB: 900, sinceLastReloadMs: MIN_BETWEEN_RELOADS_MS - 1 }, cfg), null);
    assert.equal(reloadReason({ ...base, heapMB: 900, sinceLastReloadMs: MIN_BETWEEN_RELOADS_MS }, cfg), "memory");
});

test("a limit of 0 turns that reason off, and a missing heap reading is ignored", () => {
    assert.equal(reloadReason({ ...base, heapMB: 900 }, { ...cfg, heapLimitMB: 0 }), null);
    assert.equal(reloadReason({ ...base, heapMB: null }, cfg), null);
    assert.equal(reloadReason({ ...base, pageUptimeMs: 9 * HOUR }, { ...cfg, maxHours: 0 }), null);
});
