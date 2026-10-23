/*
 * Vencord, a Discord client mod
 * Copyright (c) 2026 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

let audio: AudioContext | undefined;

// One short synthesized blip. `slide` is the ratio the pitch falls (or rises) to by the end.
export function tone(freq: number, volume = 0.1, length = 0.08, type: OscillatorType = "triangle", slide = 0.5) {
    try {
        audio ??= new AudioContext();
        const now = audio.currentTime;
        const osc = audio.createOscillator();
        const gain = audio.createGain();
        osc.type = type;
        osc.frequency.setValueAtTime(freq, now);
        osc.frequency.exponentialRampToValueAtTime(Math.max(20, freq * slide), now + length);
        gain.gain.setValueAtTime(volume, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + length);
        osc.connect(gain).connect(audio.destination);
        osc.start(now);
        osc.stop(now + length + 0.01);
    } catch { }
}
