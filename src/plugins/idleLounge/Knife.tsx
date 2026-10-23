/*
 * Vencord, a Discord client mod
 * Copyright (c) 2026 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { useRef, useState } from "@webpack/common";

import { tone } from "./sfx";
import { readStat, writeStat } from "./storage";
import { Draw, useCanvas } from "./useCanvas";

const G = 1400;
const SPIN = 9;
const TIP = 64;
// Landing within this many radians of blade-down sticks.
const TOLERANCE = 0.55;

const SKINS = [
    { name: "Steel", need: 0, stops: ["#eef2f6", "#8793a0"], handle: "#2b2f36" },
    { name: "Fade", need: 10, stops: ["#7a5cff", "#ff8a3d"], handle: "#2b2f36" },
    { name: "Doppler", need: 30, stops: ["#38b6ff", "#ff5fa2"], handle: "#1d2230" },
    { name: "Gold", need: 80, stops: ["#fff0a0", "#c8921e"], handle: "#4a3510" },
    { name: "Crimson Web", need: 200, stops: ["#ff6a6a", "#4a0f18"], handle: "#1a0d10" }
];

const rand = (a: number, b: number) => a + Math.random() * (b - a);

interface Stats { flips: number; best: number; }

function drawKnife(ctx: CanvasRenderingContext2D, skin: typeof SKINS[number]) {
    // pivot at the guard, blade pointing down
    const blade = ctx.createLinearGradient(-9, 0, 9, 0);
    blade.addColorStop(0, skin.stops[0]);
    blade.addColorStop(1, skin.stops[1]);

    ctx.fillStyle = skin.handle;
    ctx.beginPath();
    ctx.roundRect(-8, -62, 16, 56, 5);
    ctx.fill();
    ctx.fillStyle = "rgba(255,255,255,0.12)";
    for (let i = 0; i < 4; i++) ctx.fillRect(-8, -52 + i * 12, 16, 3);

    ctx.fillStyle = "#c9a227";
    ctx.fillRect(-14, -6, 28, 7);

    ctx.fillStyle = blade;
    ctx.beginPath();
    ctx.moveTo(-9, 1);
    ctx.lineTo(9, 1);
    ctx.lineTo(9, 36);
    ctx.quadraticCurveTo(7, 54, 0, TIP);
    ctx.quadraticCurveTo(-8, 50, -9, 30);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = "rgba(255,255,255,0.55)";
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(-3, 4);
    ctx.lineTo(-3, 44);
    ctx.stroke();
}

export function Knife() {
    const [stats, setStats] = useState<Stats>(() => readStat<Stats>("knife", { flips: 0, best: 0 }));
    const [skinIdx, setSkinIdx] = useState(0);
    const [streak, setStreak] = useState(0);
    const live = useRef({ stats, skinIdx });
    live.current = { stats, skinIdx };

    const ref = useCanvas((w, h) => {
        const plankY = h * 0.76;
        const restY = plankY - (TIP - 14);
        type Phase = "ready" | "flying" | "stuck" | "fail";
        let phase: Phase = "ready";
        let y = restY;
        let ang = 0;
        let vy = 0;
        let spin = 0;
        let charge = 0;
        let chDir = 1;
        let wasDown = false;
        let timer = 0;
        let wobble = 0;
        let run = 0;
        const sparks: { x: number; y: number; vx: number; vy: number; life: number; }[] = [];

        const landAngle = (c: number) => {
            const v = 520 + c * 680;
            const t = (2 * v) / G;
            const a = SPIN * t;
            const turn = a / (Math.PI * 2);
            return Math.abs(turn - Math.round(turn)) * Math.PI * 2;
        };

        const bump = (landed: boolean) => {
            const cur = live.current.stats;
            const next = { flips: cur.flips + (landed ? 1 : 0), best: cur.best };
            if (landed) {
                run++;
                next.best = Math.max(next.best, run);
            } else run = 0;
            writeStat("knife", next);
            setStats(next);
            setStreak(run);
        };

        const draw: Draw = (ctx, w, h, t, dt, p) => {
            const skin = SKINS[live.current.skinIdx];

            // dark room with a spotlight on the log
            ctx.fillStyle = "#0b0d14";
            ctx.fillRect(0, 0, w, h);
            const spot = ctx.createRadialGradient(w / 2, plankY, 10, w / 2, plankY - 40, h * 0.9);
            spot.addColorStop(0, "rgba(255,230,180,0.38)");
            spot.addColorStop(1, "rgba(255,230,180,0)");
            ctx.fillStyle = spot;
            ctx.fillRect(0, 0, w, h);

            // charging with the pointer
            const down = p.down && phase === "ready";
            if (down) {
                charge += (chDir * dt) / 0.9;
                if (charge >= 1) { charge = 1; chDir = -1; }
                if (charge <= 0) { charge = 0; chDir = 1; }
            }
            if (wasDown && !p.down && phase === "ready") {
                vy = -(520 + charge * 680);
                spin = SPIN;
                phase = "flying";
                tone(520, 0.06, 0.1, "triangle", 1.8);
            }
            wasDown = p.down && phase === "ready";
            if (phase === "ready" && !p.down) charge = 0;

            if (phase === "flying" || phase === "fail") {
                vy += G * dt;
                y += vy * dt;
                ang += spin * dt;

                if (y >= restY && vy > 0) {
                    if (phase === "flying") {
                        const a = ((ang + Math.PI) % (Math.PI * 2) + Math.PI * 2) % (Math.PI * 2) - Math.PI;
                        if (Math.abs(a) < TOLERANCE) {
                            phase = "stuck";
                            ang = 0;
                            y = restY;
                            wobble = 1;
                            timer = 0.9;
                            tone(150, 0.2, 0.12, "triangle", 0.4);
                            for (let i = 0; i < 12; i++) sparks.push({ x: w / 2, y: plankY, vx: rand(-160, 160), vy: -rand(60, 220), life: 0 });
                            bump(true);
                        } else {
                            phase = "fail";
                            vy = -rand(220, 340);
                            spin *= 0.6;
                            timer = 1.3;
                            tone(260, 0.12, 0.12, "square", 0.5);
                            bump(false);
                        }
                    } else if (Math.abs(vy) > 90) {
                        y = restY;
                        vy *= -0.35;
                        spin *= 0.5;
                        tone(210, 0.07, 0.07, "square", 0.6);
                    } else {
                        y = restY;
                        vy = 0;
                        spin = 0;
                        ang += (Math.PI / 2 - (((ang % Math.PI) + Math.PI) % Math.PI) % Math.PI) * 0.12;
                    }
                }
            }

            if (phase === "stuck" || phase === "fail") {
                timer -= dt;
                if (timer <= 0) { phase = "ready"; y = restY; ang = 0; vy = 0; spin = 0; }
            }
            wobble *= 0.93;

            // the log
            const log = ctx.createLinearGradient(0, plankY, 0, h);
            log.addColorStop(0, "#8b5a2b");
            log.addColorStop(1, "#4a2f17");
            ctx.fillStyle = log;
            ctx.fillRect(w / 2 - 150, plankY, 300, h - plankY);
            ctx.fillStyle = "#a8743c";
            ctx.fillRect(w / 2 - 150, plankY, 300, 8);
            ctx.strokeStyle = "rgba(0,0,0,0.25)";
            ctx.lineWidth = 1.5;
            for (let i = 0; i < 6; i++) {
                ctx.beginPath();
                ctx.moveTo(w / 2 - 150, plankY + 16 + i * 16);
                ctx.bezierCurveTo(w / 2 - 50, plankY + 10 + i * 16, w / 2 + 50, plankY + 22 + i * 16, w / 2 + 150, plankY + 14 + i * 16);
                ctx.stroke();
            }

            // the knife
            ctx.save();
            ctx.translate(w / 2, y);
            ctx.rotate(ang + Math.sin(t * 40) * wobble * 0.08);
            if (skin.name === "Gold" || skin.name === "Doppler") {
                ctx.shadowColor = skin.stops[1];
                ctx.shadowBlur = 14;
            }
            drawKnife(ctx, skin);
            ctx.restore();

            for (let i = sparks.length - 1; i >= 0; i--) {
                const s = sparks[i];
                s.life += dt;
                if (s.life > 0.6) { sparks.splice(i, 1); continue; }
                s.vy += 600 * dt;
                s.x += s.vx * dt;
                s.y += s.vy * dt;
                ctx.globalAlpha = 1 - s.life / 0.6;
                ctx.fillStyle = "#ffd27a";
                ctx.fillRect(s.x, s.y, 3, 3);
            }
            ctx.globalAlpha = 1;

            // power meter with a hint of whether this release would stick
            const bw = Math.min(280, w - 60);
            const bx = w / 2 - bw / 2;
            const by = h - 34;
            ctx.fillStyle = "rgba(255,255,255,0.12)";
            ctx.fillRect(bx, by, bw, 10);
            const sticky = landAngle(charge) < TOLERANCE * 0.85;
            ctx.fillStyle = down ? (sticky ? "#5fbf6a" : "#e8a33a") : "rgba(255,255,255,0.3)";
            ctx.fillRect(bx, by, bw * charge, 10);
            if (down) {
                ctx.fillStyle = sticky ? "#5fbf6a" : "#ff6a6a";
                ctx.beginPath();
                ctx.arc(bx + bw * charge, by + 5, 8, 0, Math.PI * 2);
                ctx.fill();
            }
        };

        return draw;
    }, []);

    return (
        <div>
            <div className="vc-lounge-stats">
                <span className="vc-lounge-coins">{streak} in a row</span>
                <span className="vc-lounge-muted">{stats.flips} flips landed, best streak {stats.best}</span>
            </div>
            <div className="vc-lounge-playfield">
                <canvas ref={ref} className="vc-lounge-arena" aria-label="Knife flip" />
            </div>
            <p className="vc-lounge-muted">
                Hold the mouse to charge, let go to throw. The bar goes green when the knife will land blade first.
            </p>
            <div className="vc-lounge-row-actions" role="group" aria-label="Knife skin">
                {SKINS.map((s, i) => (
                    <button
                        key={s.name}
                        className="vc-lounge-btn"
                        data-variant={i === skinIdx ? undefined : "secondary"}
                        disabled={stats.flips < s.need}
                        onClick={() => setSkinIdx(i)}
                    >
                        {stats.flips < s.need ? `${s.name}: ${s.need} flips` : s.name}
                    </button>
                ))}
            </div>
        </div>
    );
}
