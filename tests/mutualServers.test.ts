/*
 * Vencord, a Discord client mod
 * Copyright (c) 2026 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import assert from "node:assert/strict";
import { test } from "node:test";

import { commonIds, findByName } from "../src/plugins/mutualServerMembers/common";

test("commonIds keeps the order of the first list and drops repeats", () => {
    assert.deepEqual(commonIds(["a", "b", "c", "b"], ["c", "b", "x"]), ["b", "c"]);
    assert.deepEqual(commonIds([], ["a"]), []);
    assert.deepEqual(commonIds(["a"], []), []);
});

test("findByName prefers an exact name, ignoring case", () => {
    const guilds = [{ name: "Game Night" }, { name: "game" }, { name: "Gaming" }];
    const { match, others } = findByName(guilds, "GAME");
    assert.equal(match?.name, "game");
    assert.equal(others.length, 0);
});

test("findByName falls back to a partial match and reports the others", () => {
    const guilds = [{ name: "Game Night" }, { name: "Gaming" }, { name: "Cooking" }];
    const { match, others } = findByName(guilds, "gam");
    assert.equal(match?.name, "Game Night");
    assert.deepEqual(others.map(g => g.name), ["Gaming"]);
});

test("findByName finds nothing for an empty or unknown name", () => {
    assert.equal(findByName([{ name: "A" }], "").match, null);
    assert.equal(findByName([{ name: "A" }], "zzz").match, null);
});
