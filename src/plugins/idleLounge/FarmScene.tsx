/*
 * Vencord, a Discord client mod
 * Copyright (c) 2026 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { useRef } from "@webpack/common";

import { click, clickValue, formatNumber, owned } from "./game";
import { Draw, mix, rgb, useCanvas } from "./useCanvas";

interface Bit {
    x: number;
    y: number;
    vx: number;
    vy: number;
    life: number;
    max: number;
    kind: "coin" | "drop" | "spark" | "text";
    text?: string;
}

const DAY_LENGTH = 150;
// Sky colours at dawn, noon, dusk, midnight (top, bottom).
const SKY = [
    [[250, 160, 120], [255, 220, 170]],
    [[90, 170, 235], [200, 232, 250]],
    [[235, 120, 100], [255, 190, 130]],
    [[12, 18, 48], [40, 44, 90]]
];

function skyAt(phase: number) {
    const p = phase * 4;
    const i = Math.floor(p) % 4;
    const k = p - Math.floor(p);
    const a = SKY[i];
    const b = SKY[(i + 1) % 4];
    return [mix(a[0], b[0], k), mix(a[1], b[1], k)];
}

function lightLevel(phase: number) {
    // 1 at noon, 0 at midnight
    return 0.5 + Math.cos((phase - 0.25) * Math.PI * 2) * 0.5;
}

function row(count: number, cap: number, x0: number, x1: number) {
    const n = Math.min(count, cap);
    const out: number[] = [];
    for (let i = 0; i < n; i++) out.push(x0 + (x1 - x0) * (cap === 1 ? 0.5 : i / (cap - 1)));
    return out;
}

export function FarmCanvas() {
    const bus = useRef<{ spawn?: (x: number, y: number) => void; }>({});

    const canvasRef = useCanvas((w, h) => {
        const horizon = h * 0.5;
        const bits: Bit[] = [];
        const clouds = Array.from({ length: 4 }, (_, i) => ({ x: Math.random() * w, y: 20 + i * 22, s: 0.7 + Math.random() * 0.8, v: 6 + Math.random() * 8 }));
        const stars = Array.from({ length: 70 }, () => ({ x: Math.random() * w, y: Math.random() * horizon, r: Math.random() * 1.3 + 0.3, p: Math.random() * 6 }));
        let sparkClock = 0;

        bus.current.spawn = (x, y) => {
            for (let i = 0; i < 6; i++) {
                bits.push({ x, y, vx: (Math.random() - 0.5) * 140, vy: -120 - Math.random() * 120, life: 0, max: 1.1, kind: "coin" });
            }
            for (let i = 0; i < 8; i++) {
                bits.push({ x, y: y - 20, vx: (Math.random() - 0.5) * 90, vy: -40 + Math.random() * 60, life: 0, max: 0.6, kind: "drop" });
            }
            bits.push({ x, y: y - 10, vx: 0, vy: -50, life: 0, max: 0.9, kind: "text", text: `+${formatNumber(clickValue())}` });
        };

        const tree = (ctx: CanvasRenderingContext2D, x: number, y: number, s: number, t: number, light: number) => {
            ctx.fillStyle = rgb(mix([40, 25, 15], [110, 72, 40], light));
            ctx.fillRect(x - 2 * s, y - 14 * s, 4 * s, 14 * s);
            ctx.fillStyle = rgb(mix([14, 50, 30], [60, 150, 70], light));
            ctx.beginPath();
            ctx.arc(x + Math.sin(t + x) * 0.8, y - 20 * s, 12 * s, 0, Math.PI * 2);
            ctx.fill();
            ctx.fillStyle = rgb(mix([80, 20, 20], [230, 70, 60], light));
            for (let i = 0; i < 4; i++) {
                ctx.beginPath();
                ctx.arc(x + Math.cos(i * 1.6) * 7 * s, y - 20 * s + Math.sin(i * 2.3) * 6 * s, 2 * s, 0, Math.PI * 2);
                ctx.fill();
            }
        };

        const draw: Draw = (ctx, w, h, t, dt) => {
            const phase = ((t / DAY_LENGTH) + 0.2) % 1;
            const light = lightLevel(phase);
            const [top, bottom] = skyAt(phase);

            const sky = ctx.createLinearGradient(0, 0, 0, horizon);
            sky.addColorStop(0, rgb(top));
            sky.addColorStop(1, rgb(bottom));
            ctx.fillStyle = sky;
            ctx.fillRect(0, 0, w, horizon + 2);

            // stars
            if (light < 0.45) {
                ctx.fillStyle = "#fff";
                for (const s of stars) {
                    ctx.globalAlpha = (0.45 - light) * 2 * (0.6 + Math.sin(t * 2 + s.p) * 0.4);
                    ctx.beginPath();
                    ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2);
                    ctx.fill();
                }
                ctx.globalAlpha = 1;
            }

            // sun and moon travel across the sky
            const arc = (phase * 2) % 1;
            const sx = w * (0.08 + arc * 0.84);
            const sy = horizon - Math.sin(arc * Math.PI) * horizon * 0.8;
            const isDay = phase < 0.5;
            ctx.save();
            ctx.shadowColor = isDay ? "#ffd27a" : "#cfd8ff";
            ctx.shadowBlur = 30;
            ctx.fillStyle = isDay ? "#ffe08a" : "#eef1ff";
            ctx.beginPath();
            ctx.arc(sx, sy, isDay ? 20 : 15, 0, Math.PI * 2);
            ctx.fill();
            ctx.restore();

            // clouds
            for (const c of clouds) {
                c.x += c.v * dt;
                if (c.x > w + 80) c.x = -80;
                ctx.fillStyle = rgb(mix([70, 76, 110], [255, 255, 255], light), 0.85);
                for (const [dx, dy, r] of [[0, 0, 14], [16, 4, 11], [-16, 5, 10], [6, -7, 11]]) {
                    ctx.beginPath();
                    ctx.arc(c.x + dx * c.s, c.y + dy * c.s, r * c.s, 0, Math.PI * 2);
                    ctx.fill();
                }
            }

            // far hills
            ctx.fillStyle = rgb(mix([18, 40, 36], [110, 170, 120], light));
            ctx.beginPath();
            ctx.moveTo(0, horizon);
            for (let x = 0; x <= w; x += 12) ctx.lineTo(x, horizon - 14 - Math.sin(x * 0.012 + 1) * 12 - Math.sin(x * 0.03) * 4);
            ctx.lineTo(w, horizon + 4);
            ctx.lineTo(0, horizon + 4);
            ctx.fill();

            // ground
            const ground = ctx.createLinearGradient(0, horizon, 0, h);
            ground.addColorStop(0, rgb(mix([14, 38, 22], [96, 158, 70], light)));
            ground.addColorStop(1, rgb(mix([20, 28, 18], [66, 112, 46], light)));
            ctx.fillStyle = ground;
            ctx.fillRect(0, horizon, w, h - horizon);

            // furrows
            ctx.strokeStyle = rgb(mix([30, 20, 14], [90, 66, 40], light), 0.5);
            ctx.lineWidth = 2;
            for (const fy of [0.68, 0.76, 0.84, 0.93]) {
                ctx.beginPath();
                ctx.moveTo(w * 0.04, h * fy + 6);
                ctx.lineTo(w * 0.96, h * fy + 6);
                ctx.stroke();
            }

            const persp = (fy: number) => 0.55 + (fy - 0.5) * 1.3;

            // orchard
            for (const x of row(owned("orchard"), 6, w * 0.3, w * 0.66)) tree(ctx, x, h * 0.6, persp(0.6), t, light);

            // greenhouse
            if (owned("greenhouse")) {
                const gx = w * 0.08;
                const gy = h * 0.62;
                ctx.fillStyle = rgb(mix([40, 70, 80], [180, 235, 240], light), 0.55);
                ctx.fillRect(gx, gy - 30, 62, 30);
                ctx.beginPath();
                ctx.moveTo(gx - 4, gy - 30);
                ctx.lineTo(gx + 31, gy - 48);
                ctx.lineTo(gx + 66, gy - 30);
                ctx.fill();
                ctx.strokeStyle = rgb(mix([60, 70, 80], [240, 250, 250], light), 0.9);
                ctx.lineWidth = 1.5;
                ctx.strokeRect(gx, gy - 30, 62, 30);
                for (const px of [20, 41]) {
                    ctx.beginPath();
                    ctx.moveTo(gx + px, gy - 30);
                    ctx.lineTo(gx + px, gy);
                    ctx.stroke();
                }
                ctx.fillStyle = "#4caf50";
                for (let i = 0; i < 5; i++) ctx.fillRect(gx + 8 + i * 11, gy - 8 - Math.sin(t + i) * 1.5, 5, 8);
            }

            // beehives with orbiting bees
            for (const [i, x] of row(owned("beehive"), 5, w * 0.7, w * 0.9).entries()) {
                const y = h * 0.66;
                ctx.fillStyle = rgb(mix([80, 60, 20], [235, 190, 70], light));
                ctx.fillRect(x - 8, y - 14, 16, 14);
                ctx.fillStyle = rgb(mix([50, 36, 12], [150, 110, 40], light));
                ctx.fillRect(x - 10, y - 17, 20, 4);
                ctx.fillStyle = "#1c1c1c";
                ctx.fillRect(x - 3, y - 6, 6, 4);
                for (let b = 0; b < 2; b++) {
                    const a = t * 3 + i * 2 + b * 3;
                    const bx = x + Math.cos(a) * 16;
                    const by = y - 26 + Math.sin(a * 1.7) * 8;
                    ctx.fillStyle = "#f6c90e";
                    ctx.beginPath();
                    ctx.arc(bx, by, 2.2, 0, Math.PI * 2);
                    ctx.fill();
                    ctx.fillStyle = "rgba(255,255,255,0.7)";
                    ctx.beginPath();
                    ctx.ellipse(bx, by - 2.5, 2.5, 1.2, 0, 0, Math.PI * 2);
                    ctx.fill();
                }
            }

            // windmill
            if (owned("windmill")) {
                const mx = w * 0.5;
                const my = h * 0.6;
                ctx.fillStyle = rgb(mix([60, 44, 36], [205, 180, 150], light));
                ctx.beginPath();
                ctx.moveTo(mx - 12, my);
                ctx.lineTo(mx - 7, my - 44);
                ctx.lineTo(mx + 7, my - 44);
                ctx.lineTo(mx + 12, my);
                ctx.fill();
                ctx.save();
                ctx.translate(mx, my - 44);
                ctx.rotate(t * (0.5 + Math.min(Math.log10(owned("windmill") + 1), 2)));
                ctx.fillStyle = rgb(mix([90, 80, 70], [240, 232, 220], light), 0.95);
                for (let i = 0; i < 4; i++) {
                    ctx.rotate(Math.PI / 2);
                    ctx.fillRect(-2, 0, 4, 34);
                    ctx.fillRect(2, 8, 11, 22);
                }
                ctx.restore();
            }

            // berry bushes
            for (const x of row(owned("berry"), 6, w * 0.12, w * 0.88)) {
                const y = h * 0.7;
                const s = persp(0.7);
                ctx.fillStyle = rgb(mix([14, 50, 30], [50, 140, 66], light));
                ctx.beginPath();
                ctx.ellipse(x, y - 8 * s, 15 * s, 11 * s, 0, 0, Math.PI * 2);
                ctx.fill();
                ctx.fillStyle = rgb(mix([40, 20, 70], [150, 60, 200], light));
                for (let i = 0; i < 5; i++) {
                    ctx.beginPath();
                    ctx.arc(x + Math.cos(i * 1.3 + x) * 9 * s, y - 8 * s + Math.sin(i * 1.9 + x) * 6 * s, 2.2 * s, 0, Math.PI * 2);
                    ctx.fill();
                }
            }

            // pumpkins
            for (const x of row(owned("pumpkin"), 8, w * 0.1, w * 0.9)) {
                const y = h * 0.79;
                const s = persp(0.79);
                ctx.fillStyle = rgb(mix([80, 36, 8], [240, 130, 30], light));
                ctx.beginPath();
                ctx.ellipse(x, y - 8 * s, 12 * s, 9 * s, 0, 0, Math.PI * 2);
                ctx.fill();
                ctx.strokeStyle = rgb(mix([50, 20, 4], [190, 90, 16], light));
                ctx.lineWidth = 1.2;
                for (const dx of [-5, 0, 5]) {
                    ctx.beginPath();
                    ctx.ellipse(x + dx * s, y - 8 * s, 3 * s, 9 * s, 0, 0, Math.PI * 2);
                    ctx.stroke();
                }
                ctx.fillStyle = "#3b7a2c";
                ctx.fillRect(x - 1.5 * s, y - 19 * s, 3 * s, 5 * s);
            }

            // wheat swaying in the wind
            for (const [i, x] of row(owned("wheat"), 12, w * 0.08, w * 0.92).entries()) {
                const y = h * 0.87;
                const s = persp(0.87);
                ctx.strokeStyle = rgb(mix([80, 70, 20], [226, 190, 70], light));
                ctx.lineWidth = 1.6 * s;
                for (let k = -1; k <= 1; k++) {
                    const sway = Math.sin(t * 1.8 + i * 0.7 + k) * 4 * s;
                    ctx.beginPath();
                    ctx.moveTo(x + k * 5 * s, y);
                    ctx.quadraticCurveTo(x + k * 5 * s, y - 14 * s, x + k * 5 * s + sway, y - 26 * s);
                    ctx.stroke();
                    ctx.fillStyle = ctx.strokeStyle;
                    ctx.beginPath();
                    ctx.ellipse(x + k * 5 * s + sway, y - 29 * s, 2 * s, 5 * s, sway * 0.05, 0, Math.PI * 2);
                    ctx.fill();
                }
            }

            // carrots
            for (const [i, x] of row(owned("carrot"), 12, w * 0.07, w * 0.93).entries()) {
                const y = h * 0.95;
                const s = persp(0.95);
                ctx.fillStyle = rgb(mix([14, 60, 20], [60, 170, 60], light));
                for (const a of [-0.5, 0, 0.5]) {
                    ctx.beginPath();
                    ctx.ellipse(x + Math.sin(a + Math.sin(t * 2 + i) * 0.1) * 8 * s, y - 9 * s, 2.5 * s, 8 * s, a, 0, Math.PI * 2);
                    ctx.fill();
                }
                ctx.fillStyle = rgb(mix([90, 40, 10], [245, 130, 30], light));
                ctx.beginPath();
                ctx.moveTo(x - 4 * s, y - 2 * s);
                ctx.lineTo(x + 4 * s, y - 2 * s);
                ctx.lineTo(x, y + 8 * s);
                ctx.fill();
            }

            // hydroponic towers
            for (const [i, x] of row(owned("hydro"), 5, w * 0.17, w * 0.27).entries()) {
                const y = h * 0.64;
                ctx.fillStyle = rgb(mix([40, 55, 60], [190, 215, 220], light));
                ctx.fillRect(x - 5, y - 46, 10, 46);
                ctx.fillStyle = `rgba(110,255,170,${0.45 + Math.sin(t * 2 + i) * 0.2})`;
                for (let k = 0; k < 4; k++) ctx.fillRect(x - 9, y - 40 + k * 11, 18, 4);
            }

            // harvest bots patrolling the furrows
            for (let i = 0; i < Math.min(owned("robot"), 6); i++) {
                const x = w * 0.1 + ((t * 28 + i * 140) % (w * 0.8));
                const y = h * (0.9 - (i % 3) * 0.08);
                ctx.fillStyle = rgb(mix([60, 70, 90], [170, 190, 215], light));
                ctx.fillRect(x - 7, y - 14, 14, 10);
                ctx.fillStyle = "#6ee7ff";
                ctx.fillRect(x - 3, y - 11, 6, 3);
                ctx.fillStyle = rgb(mix([30, 30, 36], [90, 90, 100], light));
                ctx.fillRect(x - 8, y - 4, 16, 4);
            }

            // floating island
            if (owned("island")) {
                const ix = w * 0.78;
                const iy = h * 0.2 + Math.sin(t * 0.8) * 5;
                ctx.fillStyle = rgb(mix([40, 70, 40], [90, 170, 80], light));
                ctx.beginPath();
                ctx.ellipse(ix, iy, 46, 11, 0, Math.PI, 0);
                ctx.fill();
                ctx.fillStyle = rgb(mix([40, 30, 24], [120, 90, 64], light));
                ctx.beginPath();
                ctx.moveTo(ix - 46, iy);
                ctx.lineTo(ix + 46, iy);
                ctx.lineTo(ix + 8, iy + 34);
                ctx.lineTo(ix - 12, iy + 28);
                ctx.fill();
                ctx.fillStyle = rgb(mix([14, 50, 30], [50, 140, 66], light));
                ctx.beginPath();
                ctx.arc(ix - 10, iy - 12, 10, 0, Math.PI * 2);
                ctx.fill();
            }

            // star nursery: tiny suns drifting in the sky
            for (let i = 0; i < Math.min(owned("nursery"), 8); i++) {
                const sx2 = w * (0.08 + i * 0.11) + Math.sin(t * 0.5 + i) * 12;
                const sy2 = h * 0.1 + Math.cos(t * 0.7 + i * 2) * 10;
                const g = ctx.createRadialGradient(sx2, sy2, 0, sx2, sy2, 14);
                g.addColorStop(0, "rgba(255,240,170,0.95)");
                g.addColorStop(1, "rgba(255,200,90,0)");
                ctx.fillStyle = g;
                ctx.beginPath();
                ctx.arc(sx2, sy2, 14, 0, Math.PI * 2);
                ctx.fill();
            }

            // the world tree
            if (owned("worldtree")) {
                const tx = w * 0.95;
                const ty = h * 0.66;
                ctx.fillStyle = rgb(mix([40, 26, 16], [100, 66, 38], light));
                ctx.fillRect(tx - 6, ty - 70, 12, 70);
                ctx.fillStyle = rgb(mix([14, 60, 40], [50, 160, 90], light));
                for (const [dx, dy, r] of [[0, -84, 30], [-22, -70, 20], [22, -70, 20]]) {
                    ctx.beginPath();
                    ctx.arc(tx + dx + Math.sin(t * 0.8) * 1.5, ty + dy, r, 0, Math.PI * 2);
                    ctx.fill();
                }
            }

            // light production sparkles
            sparkClock += dt;
            if (sparkClock > 0.35 && owned("carrot") + owned("wheat") > 0) {
                sparkClock = 0;
                bits.push({ x: w * (0.1 + Math.random() * 0.8), y: h * (0.72 + Math.random() * 0.22), vx: 0, vy: -30, life: 0, max: 1.2, kind: "spark" });
            }

            // particles
            ctx.textAlign = "center";
            ctx.font = "bold 15px sans-serif";
            for (let i = bits.length - 1; i >= 0; i--) {
                const b = bits[i];
                b.life += dt;
                if (b.life >= b.max) { bits.splice(i, 1); continue; }
                const k = b.life / b.max;
                b.x += b.vx * dt;
                b.y += b.vy * dt;
                if (b.kind === "coin" || b.kind === "drop") b.vy += 520 * dt;

                ctx.globalAlpha = 1 - k * k;
                if (b.kind === "coin") {
                    ctx.fillStyle = "#ffcf33";
                    ctx.strokeStyle = "#b8860b";
                    ctx.lineWidth = 1.5;
                    ctx.beginPath();
                    ctx.ellipse(b.x, b.y, 5 * Math.abs(Math.cos(b.life * 12)) + 1, 5, 0, 0, Math.PI * 2);
                    ctx.fill();
                    ctx.stroke();
                } else if (b.kind === "drop") {
                    ctx.fillStyle = "#8fd3ff";
                    ctx.beginPath();
                    ctx.arc(b.x, b.y, 2.5, 0, Math.PI * 2);
                    ctx.fill();
                } else if (b.kind === "spark") {
                    ctx.fillStyle = "#fff6a8";
                    ctx.beginPath();
                    ctx.arc(b.x, b.y, 2.2 * (1 - k), 0, Math.PI * 2);
                    ctx.fill();
                } else if (b.text) {
                    ctx.fillStyle = "#fff";
                    ctx.strokeStyle = "rgba(0,0,0,0.55)";
                    ctx.lineWidth = 3;
                    ctx.strokeText(b.text, b.x, b.y);
                    ctx.fillText(b.text, b.x, b.y);
                }
            }
            ctx.globalAlpha = 1;

            // night tint
            ctx.fillStyle = `rgba(8,12,40,${(1 - light) * 0.35})`;
            ctx.fillRect(0, 0, w, h);
        };

        return draw;
    });

    function onPointerDown(e: React.PointerEvent<HTMLCanvasElement>) {
        const rect = e.currentTarget.getBoundingClientRect();
        click();
        bus.current.spawn?.(e.clientX - rect.left, e.clientY - rect.top);
    }

    return (
        <canvas
            ref={canvasRef}
            className="vc-lounge-farmcanvas"
            onPointerDown={onPointerDown}
            aria-label="Your farm. Click anywhere to water it."
        />
    );
}
