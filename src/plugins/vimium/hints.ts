/*
 * Vencord, a Discord client mod
 * Copyright (c) 2026 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

/**
 * `count` labels of the same length made from `alphabet`, so no label is the start of another one
 * and typing letters can only ever match one. The shortest length that fits is used.
 */
export function hintLabels(count: number, alphabet: string): string[] {
    const letters = [...new Set(alphabet.toLowerCase())];
    if (letters.length < 2 || count <= 0) return [];
    let length = 1;
    while (letters.length ** length < count) length++;

    const labels: string[] = [];
    for (let i = 0; i < count; i++) {
        let label = "";
        let n = i;
        for (let k = 0; k < length; k++) {
            label = letters[n % letters.length] + label;
            n = Math.floor(n / letters.length);
        }
        labels.push(label);
    }
    return labels;
}

/** Labels that still match what has been typed so far, as indexes into `labels`. */
export function matching(labels: string[], typed: string): number[] {
    return labels.flatMap((l, i) => (l.startsWith(typed) ? [i] : []));
}
