/*
 * Vencord, a Discord client mod
 * Copyright (c) 2026 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import assert from "node:assert/strict";
import { test } from "node:test";

import { readExif, readPngText } from "../src/plugins/metadataScanner/exif";

const u16 = (n: number) => [n & 0xFF, n >> 8];
const u32 = (n: number) => [n & 0xFF, (n >> 8) & 0xFF, (n >> 16) & 0xFF, (n >>> 24) & 0xFF];
const ascii = (s: string) => [...s].map(c => c.charCodeAt(0)).concat(0);
const entry = (tag: number, type: number, count: number, value: number[]) => [...u16(tag), ...u16(type), ...u32(count), ...value, ...Array(4 - value.length).fill(0)];

/** A little endian EXIF block: Make "Canon", and GPS 50.5 N and 30.25 W. All offsets count from the TIFF header. */
function buildJpeg(): Uint8Array {
    const make = ascii("Canon");                          // 6 bytes, stored outside the entry
    const ifd0Len = 2 + 2 * 12 + 4;                       // 2 entries
    const makeAt = 8 + ifd0Len;
    const gpsIfdAt = makeAt + make.length;
    const gpsLen = 2 + 4 * 12 + 4;
    const latAt = gpsIfdAt + gpsLen;
    const lonAt = latAt + 24;
    const rational = (a: number, b: number) => [...u32(a), ...u32(b)];

    const tiff = [
        0x49, 0x49, ...u16(42), ...u32(8),
        ...u16(2),
        ...entry(0x010F, 2, make.length, u32(makeAt)),
        ...entry(0x8825, 4, 1, u32(gpsIfdAt)),
        ...u32(0),
        ...make,
        ...u16(4),
        ...entry(1, 2, 2, [0x4E, 0, 0, 0]),               // "N"
        ...entry(2, 5, 3, u32(latAt)),
        ...entry(3, 2, 2, [0x57, 0, 0, 0]),               // "W"
        ...entry(4, 5, 3, u32(lonAt)),
        ...u32(0),
        ...rational(50, 1), ...rational(30, 1), ...rational(0, 1),   // 50 deg 30 min = 50.5
        ...rational(30, 1), ...rational(15, 1), ...rational(0, 1)    // 30 deg 15 min = 30.25
    ];
    const exif = [...ascii("Exif"), 0, ...tiff];          // "Exif\0\0"
    const size = exif.length + 2;
    return Uint8Array.from([0xFF, 0xD8, 0xFF, 0xE1, size >> 8, size & 0xFF, ...exif, 0xFF, 0xD9]);
}

test("reads the camera make and GPS position from a JPEG", () => {
    const info = readExif(buildJpeg());
    assert.equal(info?.make, "Canon");
    assert.deepEqual(info?.gps, { lat: 50.5, lon: -30.25 });
});

test("a JPEG without EXIF and other files give null", () => {
    assert.equal(readExif(Uint8Array.from([0xFF, 0xD8, 0xFF, 0xD9])), null);
    assert.equal(readExif(Uint8Array.from([1, 2, 3, 4])), null);
    assert.equal(readExif(new Uint8Array(0)), null);
});

test("a truncated EXIF block does not throw", () => {
    const full = buildJpeg();
    assert.doesNotThrow(() => readExif(full.slice(0, 40)));
});

test("reads PNG text chunks", () => {
    const chunk = (type: string, body: number[]) => [...u32(body.length).reverse(), ...[...type].map(c => c.charCodeAt(0)), ...body, 0, 0, 0, 0];
    const text = [...ascii("parameters").slice(0, -1), 0, ...[..."a cat"].map(c => c.charCodeAt(0))];
    const png = Uint8Array.from([0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A, ...chunk("tEXt", text), ...chunk("IEND", [])]);
    assert.deepEqual(readPngText(png), [{ key: "parameters", text: "a cat" }]);
});

test("not a PNG gives no text", () => {
    assert.deepEqual(readPngText(Uint8Array.from([1, 2, 3])), []);
});
