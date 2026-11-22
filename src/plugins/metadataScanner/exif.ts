/*
 * Vencord, a Discord client mod
 * Copyright (c) 2026 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

export interface ExifInfo {
    make?: string;
    model?: string;
    software?: string;
    takenAt?: string;
    gps?: { lat: number; lon: number; };
}

const TYPE_ASCII = 2;
const TYPE_SHORT = 3;
const TYPE_LONG = 4;
const TYPE_RATIONAL = 5;

const TAG_MAKE = 0x010F;
const TAG_MODEL = 0x0110;
const TAG_SOFTWARE = 0x0131;
const TAG_DATETIME = 0x0132;
const TAG_EXIF_IFD = 0x8769;
const TAG_GPS_IFD = 0x8825;
const TAG_DATETIME_ORIGINAL = 0x9003;

interface Entry { tag: number; type: number; count: number; valueAt: number; }

class Reader {
    constructor(private view: DataView, private tiff: number, private little: boolean) { }

    u16(at: number) { return this.view.getUint16(this.tiff + at, this.little); }
    u32(at: number) { return this.view.getUint32(this.tiff + at, this.little); }

    entries(ifdOffset: number): Entry[] {
        const count = this.u16(ifdOffset);
        const out: Entry[] = [];
        for (let i = 0; i < Math.min(count, 200); i++) {
            const at = ifdOffset + 2 + i * 12;
            const type = this.u16(at + 2);
            const n = this.u32(at + 4);
            const size = { [TYPE_ASCII]: 1, [TYPE_SHORT]: 2, [TYPE_LONG]: 4, [TYPE_RATIONAL]: 8 }[type] ?? 1;
            // A value of 4 bytes or less sits right in the entry, a bigger one is stored elsewhere.
            const valueAt = size * n <= 4 ? at + 8 : this.u32(at + 8);
            out.push({ tag: this.u16(at), type, count: n, valueAt });
        }
        return out;
    }

    text(e: Entry): string {
        const bytes: number[] = [];
        for (let i = 0; i < Math.min(e.count, 200); i++) {
            const b = this.view.getUint8(this.tiff + e.valueAt + i);
            if (b === 0) break;
            bytes.push(b);
        }
        return String.fromCharCode(...bytes).trim();
    }

    long(e: Entry): number {
        return e.type === TYPE_SHORT ? this.u16(e.valueAt) : this.u32(e.valueAt);
    }

    /** Degrees, minutes and seconds stored as three fractions, turned into decimal degrees. */
    degrees(e: Entry): number {
        const part = (i: number) => this.u32(e.valueAt + i * 8) / (this.u32(e.valueAt + i * 8 + 4) || 1);
        return part(0) + part(1) / 60 + part(2) / 3600;
    }
}

function readTiff(view: DataView, tiff: number): ExifInfo | null {
    const order = String.fromCharCode(view.getUint8(tiff), view.getUint8(tiff + 1));
    if (order !== "II" && order !== "MM") return null;
    const r = new Reader(view, tiff, order === "II");
    if (r.u16(2) !== 42) return null;

    const info: ExifInfo = {};
    for (const e of r.entries(r.u32(4))) {
        if (e.tag === TAG_MAKE) info.make = r.text(e);
        else if (e.tag === TAG_MODEL) info.model = r.text(e);
        else if (e.tag === TAG_SOFTWARE) info.software = r.text(e);
        else if (e.tag === TAG_DATETIME) info.takenAt ??= r.text(e);
        else if (e.tag === TAG_EXIF_IFD) {
            for (const x of r.entries(r.long(e))) if (x.tag === TAG_DATETIME_ORIGINAL) info.takenAt = r.text(x);
        } else if (e.tag === TAG_GPS_IFD) {
            const gps = r.entries(r.long(e));
            const get = (tag: number) => gps.find(g => g.tag === tag);
            const latRef = get(1), lat = get(2), lonRef = get(3), lon = get(4);
            if (latRef && lat && lonRef && lon) {
                const la = r.degrees(lat) * (r.text(latRef) === "S" ? -1 : 1);
                const lo = r.degrees(lon) * (r.text(lonRef) === "W" ? -1 : 1);
                info.gps = { lat: Math.round(la * 1e6) / 1e6, lon: Math.round(lo * 1e6) / 1e6 };
            }
        }
    }
    return info;
}

/** Reads camera, time and GPS data out of a JPEG file. Null when the file has none or is not a JPEG. */
export function readExif(data: Uint8Array): ExifInfo | null {
    try {
        const view = new DataView(data.buffer, data.byteOffset, data.byteLength);
        if (view.getUint16(0) !== 0xFFD8) return null;
        let i = 2;
        while (i + 4 <= data.length && data[i] === 0xFF) {
            const marker = data[i + 1];
            if (marker === 0xDA) break;
            const size = view.getUint16(i + 2);
            const isExif = marker === 0xE1 && String.fromCharCode(...data.slice(i + 4, i + 8)) === "Exif";
            if (isExif) return readTiff(view, i + 10);
            i += 2 + size;
        }
        return null;
    } catch {
        return null;
    }
}

/**
 * Text chunks of a PNG file as keyword and text pairs. AI image tools often leave their prompt
 * here, under a keyword such as "parameters".
 */
export function readPngText(data: Uint8Array, maxEntries = 10): { key: string; text: string; }[] {
    const out: { key: string; text: string; }[] = [];
    try {
        const view = new DataView(data.buffer, data.byteOffset, data.byteLength);
        const sig = [0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A];
        if (!sig.every((b, k) => data[k] === b)) return out;
        let i = 8;
        while (i + 8 <= data.length && out.length < maxEntries) {
            const len = view.getUint32(i);
            const type = String.fromCharCode(...data.slice(i + 4, i + 8));
            if (type === "IEND") break;
            if (type === "tEXt") {
                const body = data.slice(i + 8, i + 8 + len);
                const zero = body.indexOf(0);
                if (zero > 0) {
                    const decode = (b: Uint8Array) => Array.from(b, c => String.fromCharCode(c)).join("");
                    out.push({ key: decode(body.slice(0, zero)), text: decode(body.slice(zero + 1)) });
                }
            }
            i += 12 + len;
        }
    } catch {
        // A damaged file just gives what was read so far.
    }
    return out;
}
