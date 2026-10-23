/*
 * Vencord, a Discord client mod
 * Copyright (c) 2026 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { useEffect, useRef, useState } from "@webpack/common";

const COLS = 8;
const ROWS = 6;
const HUES = [350, 30, 55, 140, 200, 270];

let audio: AudioContext | undefined;

function click(freq: number, volume = 0.12, length = 0.06) {
    try {
        audio ??= new AudioContext();
        const now = audio.currentTime;
        const osc = audio.createOscillator();
        const gain = audio.createGain();
        osc.type = "triangle";
        osc.frequency.setValueAtTime(freq, now);
        osc.frequency.exponentialRampToValueAtTime(freq * 0.5, now + length);
        gain.gain.setValueAtTime(volume, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + length);
        osc.connect(gain).connect(audio.destination);
        osc.start(now);
        osc.stop(now + length + 0.01);
    } catch { }
}

function PopIt() {
    const [popped, setPopped] = useState<boolean[]>(() => Array(COLS * ROWS).fill(false));
    const [total, setTotal] = useState(0);

    function toggle(i: number) {
        const next = popped.slice();
        next[i] = !next[i];
        click(next[i] ? 520 + Math.random() * 80 : 760 + Math.random() * 80);
        setTotal(t => t + 1);
        if (next.every(Boolean)) {
            click(1000, 0.15, 0.2);
            setTimeout(() => setPopped(Array(COLS * ROWS).fill(false)), 450);
        }
        setPopped(next);
    }

    return (
        <div>
            <div className="vc-lounge-pop-grid" style={{ gridTemplateColumns: `repeat(${COLS}, 1fr)` }}>
                {popped.map((p, i) => (
                    <button
                        key={i}
                        className="vc-lounge-bubble"
                        data-popped={p}
                        style={{ "--hue": HUES[Math.floor(i / COLS) % HUES.length] } as React.CSSProperties}
                        onClick={() => toggle(i)}
                        aria-label={p ? "Unpop" : "Pop"}
                        aria-pressed={p}
                    />
                ))}
            </div>
            <div className="vc-lounge-muted" style={{ marginTop: 6 }}>{total} pops. Fill the board and it resets.</div>
        </div>
    );
}

function Spinner() {
    const [angle, setAngle] = useState(0);
    const velocity = useRef(0);
    const raf = useRef(0);

    useEffect(() => {
        let last = performance.now();
        const frame = (now: number) => {
            raf.current = requestAnimationFrame(frame);
            const dt = Math.min((now - last) / 1000, 0.1);
            last = now;
            if (Math.abs(velocity.current) < 0.5) { velocity.current = 0; return; }
            velocity.current *= 0.5 ** (dt / 2.5);
            setAngle(a => (a + velocity.current * dt) % 360);
        };
        raf.current = requestAnimationFrame(frame);
        return () => cancelAnimationFrame(raf.current);
    }, []);

    function flick() {
        velocity.current = Math.min(velocity.current + 500, 3000);
        click(300 + Math.random() * 40, 0.05, 0.04);
    }

    return (
        <button className="vc-lounge-spinner" onClick={flick} aria-label="Flick the spinner">
            <svg viewBox="-60 -60 120 120" style={{ transform: `rotate(${angle}deg)` }}>
                {[0, 120, 240].map(a => (
                    <g key={a} transform={`rotate(${a})`}>
                        <circle cx="0" cy="-34" r="20" fill={`hsl(${a + 200} 70% 55%)`} />
                        <circle cx="0" cy="-34" r="9" fill="#1e1f22" />
                    </g>
                ))}
                <circle r="16" fill="#d8dadd" />
                <circle r="7" fill="#1e1f22" />
            </svg>
        </button>
    );
}

function Switches() {
    const [on, setOn] = useState<boolean[]>(() => Array(8).fill(false));

    return (
        <div className="vc-lounge-switches">
            {on.map((v, i) => (
                <button
                    key={i}
                    className="vc-lounge-switch"
                    data-on={v}
                    role="switch"
                    aria-checked={v}
                    onClick={() => {
                        setOn(o => o.map((x, j) => (j === i ? !x : x)));
                        click(v ? 220 : 340, 0.14, 0.05);
                    }}
                />
            ))}
        </div>
    );
}

function BigButton() {
    const [count, setCount] = useState(0);
    return (
        <button
            className="vc-lounge-bigbutton"
            onClick={() => {
                setCount(c => c + 1);
                click(180 + Math.random() * 30, 0.2, 0.08);
            }}
        >
            <span>{count}</span>
        </button>
    );
}

export function Fidget() {
    return (
        <div className="vc-lounge-fidget">
            <div>
                <div className="vc-lounge-section">Pop it</div>
                <PopIt />
            </div>
            <div>
                <div className="vc-lounge-section">Spinner</div>
                <Spinner />
                <div className="vc-lounge-section">Switches</div>
                <Switches />
                <div className="vc-lounge-section">Button</div>
                <BigButton />
            </div>
        </div>
    );
}
