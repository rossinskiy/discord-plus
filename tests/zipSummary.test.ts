/*
 * Vencord, a Discord client mod
 * Copyright (c) 2026 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import assert from "node:assert/strict";
import { test } from "node:test";

import { describeZip, formatSize, isRiskyPath } from "../src/plugins/zipPreview/summary";

test("formatSize picks a readable unit", () => {
    assert.equal(formatSize(0), "0 B");
    assert.equal(formatSize(1023), "1023 B");
    assert.equal(formatSize(1536), "1.5 KB");
    assert.equal(formatSize(5 * 1024 * 1024), "5 MB");
    assert.equal(formatSize(300 * 1024 * 1024), "300 MB");
    assert.equal(formatSize(3 * 1024 ** 3), "3 GB");
});

test("isRiskyPath spots paths that escape the folder", () => {
    assert.equal(isRiskyPath("docs/readme.txt"), false);
    assert.equal(isRiskyPath("../evil.dll"), true);
    assert.equal(isRiskyPath("a/../../evil"), true);
    assert.equal(isRiskyPath("/etc/passwd"), true);
    assert.equal(isRiskyPath("C:\\Windows\\x.exe"), true);
    assert.equal(isRiskyPath("a\\..\\b"), true);
    assert.equal(isRiskyPath("file..name.txt"), false);
});

test("describeZip skips folders, totals sizes and counts risky entries", () => {
    const info = describeZip([
        { name: "src/", size: 0 },
        { name: "src/a.txt", size: 1000 },
        { name: "../x.exe", size: 2000 }
    ]);
    assert.equal(info.files, 2);
    assert.equal(info.total, 3000);
    assert.equal(info.risky, 1);
    assert.deepEqual(info.lines, ["src/a.txt (1000 B)", "../x.exe (2 KB)"]);
});

test("describeZip lists at most max entries", () => {
    const many = Array.from({ length: 100 }, (_, i) => ({ name: `f${i}`, size: 1 }));
    const info = describeZip(many, 10);
    assert.equal(info.files, 100);
    assert.equal(info.lines.length, 10);
});
