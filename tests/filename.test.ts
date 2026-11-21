/*
 * Vencord, a Discord client mod
 * Copyright (c) 2026 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import assert from "node:assert/strict";
import { test } from "node:test";

import { safeFilename } from "../src/plugins/directFileDownload/filename";

test("a normal name stays as it is", () => {
    assert.equal(safeFilename("photo (1).png"), "photo (1).png");
    assert.equal(safeFilename("отчёт.pdf"), "отчёт.pdf");
});

test("folders and forbidden characters are replaced", () => {
    assert.equal(safeFilename("../../etc/passwd"), "_.._etc_passwd");
    assert.equal(safeFilename("a:b*c?.txt"), "a_b_c_.txt");
});

test("leading dots are dropped and empty names get the fallback", () => {
    assert.equal(safeFilename(".hidden"), "hidden");
    assert.equal(safeFilename("   "), "file");
    assert.equal(safeFilename("", "image"), "image");
});

test("a very long name is cut", () => {
    assert.equal(safeFilename("x".repeat(400)).length, 150);
});
