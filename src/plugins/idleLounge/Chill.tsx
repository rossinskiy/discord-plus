/*
 * Vencord, a Discord client mod
 * Copyright (c) 2026 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { useEffect, useState } from "@webpack/common";

import { SPECIES, Species, state } from "./game";
import { fireflies, galaxy, lava, zen } from "./scenes";
import { Draw, useCanvas } from "./useCanvas";

type Scene = "aquarium" | "fireplace" | "aurora" | "rain" | "zen" | "fireflies" | "lava" | "galaxy";

const SCENES: { id: Scene; label: string; }[] = [
    { id: "aquarium", label: "Aquarium" },
    { id: "fireplace", label: "Fireplace" },
    { id: "aurora", label: "Aurora" },
    { id: "rain", label: "Rainy window" },
    { id: "zen", label: "Zen garden" },
    { id: "fireflies", label: "Fireflies" },
    { id: "lava", label: "Lava lamp" },
    { id: "galaxy", label: "Galaxy" }
];

const HINTS: Record<Scene, string> = {
    aquarium: "Click the water to drop food. Click a fish to startle it.",
    fireplace: "Hold to blow on the fire. Click to fling sparks.",
    aurora: "Click stars to connect them. Click empty sky for a shooting star. Move to bend the lights.",
    rain: "Drag to wipe the fog off the glass.",
    zen: "Drag to rake the sand. Double-click to smooth it.",
    fireflies: "Move to attract fireflies. Click to call more.",
    lava: "Click to change the colour. Drag to push the blobs around.",
    galaxy: "Hold to pull stars in. Click for a supernova."
};

interface Swimmer {
    species: Species | null;
    x: number;
    y: number;
    vx: number;
    targetY: number;
    phase: number;
    scale: number;
    dart: number;
}

const rand = (a: number, b: number) => a + Math.random() * (b - a);

function makeSwimmer(species: Species | null, w: number, h: number): Swimmer {
    return {
        species,
        x: rand(0, w),
        y: rand(60, h - 150),
        vx: (Math.random() < 0.5 ? -1 : 1) * rand(18, 48),
        targetY: rand(60, h - 150),
        phase: rand(0, 6.28),
        scale: rand(0.85, 1.15),
        dart: 0
    };
}

function drawFish(ctx: CanvasRenderingContext2D, f: Swimmer, t: number) {
    const size = (f.species?.size ?? 14) * f.scale;
    const body = f.species?.color ?? "#8fb7d8";
    const accent = f.species?.accent ?? "#5a86a8";
    const wag = Math.sin(t * 7 + f.phase) * 0.4;
    const dir = f.vx >= 0 ? 1 : -1;

    ctx.save();
    ctx.translate(f.x, f.y);
    ctx.scale(dir, 1);
    ctx.rotate(Math.atan2(f.targetY - f.y, 400) * 0.6);

    if (f.species?.rarity === "legendary" || f.species?.rarity === "mythic" || f.species?.id === "lanternfish") {
        ctx.shadowColor = f.species.accent;
        ctx.shadowBlur = 22;
    }

    ctx.fillStyle = accent;
    ctx.beginPath();
    ctx.moveTo(-size * 0.8, 0);
    ctx.quadraticCurveTo(-size * 1.2, wag * size, -size * 1.5, -size * 0.5 + wag * size * 0.6);
    ctx.lineTo(-size * 1.5, size * 0.5 + wag * size * 0.6);
    ctx.quadraticCurveTo(-size * 1.2, wag * size, -size * 0.8, 0);
    ctx.fill();

    const grad = ctx.createLinearGradient(0, -size * 0.5, 0, size * 0.5);
    grad.addColorStop(0, body);
    grad.addColorStop(1, accent);
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.ellipse(0, 0, size, size * 0.52, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.shadowBlur = 0;

    ctx.fillStyle = "rgba(255,255,255,0.25)";
    ctx.beginPath();
    ctx.ellipse(size * 0.1, -size * 0.22, size * 0.6, size * 0.14, 0, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = accent;
    ctx.beginPath();
    ctx.moveTo(-size * 0.1, -size * 0.48);
    ctx.quadraticCurveTo(size * 0.2, -size * 0.95 + wag * 4, size * 0.5, -size * 0.4);
    ctx.fill();

    ctx.fillStyle = "#fff";
    ctx.beginPath();
    ctx.arc(size * 0.55, -size * 0.1, Math.max(2, size * 0.1), 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "#0c1218";
    ctx.beginPath();
    ctx.arc(size * 0.58, -size * 0.1, Math.max(1, size * 0.05), 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
}

function aquarium(w: number, h: number): Draw {
    const fish: Swimmer[] = [];
    for (const s of SPECIES) {
        const n = Math.min(state.caught[s.id] ?? 0, 4);
        for (let i = 0; i < n; i++) fish.push(makeSwimmer(s, w, h));
    }
    for (let i = Math.max(0, 5 - fish.length); i > 0; i--) fish.push(makeSwimmer(null, w, h));

    const jellies = Array.from({ length: 3 }, () => ({ x: rand(0, w), y: rand(60, h - 200), p: rand(0, 6), s: rand(0.8, 1.3) }));
    const plankton = Array.from({ length: 60 }, () => ({ x: rand(0, w), y: rand(0, h), r: rand(0.6, 1.8), v: rand(3, 10) }));
    const bubbles: { x: number; y: number; r: number; v: number; p: number; }[] = [];
    const coral = Array.from({ length: 7 }, (_, i) => ({
        x: (i + 0.5) * (w / 7) + rand(-20, 20),
        hue: [330, 20, 280, 170, 10, 300, 200][i],
        s: rand(0.8, 1.4)
    }));
    let shadow = { x: -300, v: 0, y: 120 };
    const foods: { x: number; y: number; v: number; }[] = [];

    return (ctx, w, h, t, dt, p) => {
        const water = ctx.createLinearGradient(0, 0, 0, h);
        water.addColorStop(0, "#3aa0cc");
        water.addColorStop(0.55, "#115b88");
        water.addColorStop(1, "#06223a");
        ctx.fillStyle = water;
        ctx.fillRect(0, 0, w, h);

        // god rays
        ctx.save();
        ctx.globalCompositeOperation = "lighter";
        for (let i = 0; i < 6; i++) {
            const x = ((i * 0.2 + t * 0.012) % 1.3) * w - w * 0.15;
            const g = ctx.createLinearGradient(0, 0, 0, h);
            g.addColorStop(0, "rgba(180,235,255,0.16)");
            g.addColorStop(1, "rgba(180,235,255,0)");
            ctx.fillStyle = g;
            ctx.beginPath();
            ctx.moveTo(x, 0);
            ctx.lineTo(x + 50 + Math.sin(t + i) * 12, 0);
            ctx.lineTo(x - 80, h);
            ctx.lineTo(x - 160, h);
            ctx.fill();
        }
        ctx.restore();

        // a big shadow sometimes drifts past in the deep
        if (shadow.v === 0 && Math.random() < dt * 0.02) {
            const dir = Math.random() < 0.5 ? 1 : -1;
            shadow = { x: dir > 0 ? -260 : w + 260, v: dir * 40, y: rand(h * 0.3, h * 0.6) };
        }
        if (shadow.v) {
            shadow.x += shadow.v * dt;
            ctx.fillStyle = "rgba(2,14,28,0.35)";
            ctx.beginPath();
            ctx.ellipse(shadow.x, shadow.y, 190, 46, 0, 0, Math.PI * 2);
            ctx.fill();
            ctx.beginPath();
            ctx.moveTo(shadow.x - Math.sign(shadow.v) * 170, shadow.y);
            ctx.lineTo(shadow.x - Math.sign(shadow.v) * 260, shadow.y - 40 + Math.sin(t) * 10);
            ctx.lineTo(shadow.x - Math.sign(shadow.v) * 260, shadow.y + 40 + Math.sin(t) * 10);
            ctx.fill();
            if (shadow.x < -300 || shadow.x > w + 300) shadow.v = 0;
        }

        // drifting plankton
        ctx.fillStyle = "rgba(210,245,255,0.5)";
        for (const p of plankton) {
            p.y -= p.v * dt;
            p.x += Math.sin(t + p.r * 5) * 4 * dt;
            if (p.y < -4) { p.y = h + 4; p.x = rand(0, w); }
            ctx.beginPath();
            ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
            ctx.fill();
        }

        // jellyfish
        for (const j of jellies) {
            const pulse = Math.sin(t * 1.6 + j.p);
            j.y -= (8 + pulse * 10) * dt;
            j.x += Math.sin(t * 0.4 + j.p) * 10 * dt;
            if (j.y < -60) { j.y = h; j.x = rand(0, w); }
            ctx.save();
            ctx.translate(j.x, j.y);
            ctx.scale(j.s * (1 + pulse * 0.06), j.s * (1 - pulse * 0.08));
            ctx.shadowColor = "#ff9be8";
            ctx.shadowBlur = 24;
            ctx.fillStyle = "rgba(255,160,235,0.55)";
            ctx.beginPath();
            ctx.arc(0, 0, 24, Math.PI, 0);
            ctx.quadraticCurveTo(0, 10, -24, 0);
            ctx.fill();
            ctx.shadowBlur = 0;
            ctx.strokeStyle = "rgba(255,190,240,0.6)";
            ctx.lineWidth = 2;
            for (let k = -3; k <= 3; k++) {
                ctx.beginPath();
                ctx.moveTo(k * 7, 4);
                for (let s = 1; s <= 5; s++) ctx.lineTo(k * 7 + Math.sin(t * 2 + s + k) * 4, 4 + s * 8);
                ctx.stroke();
            }
            ctx.restore();
        }

        // sand and coral
        ctx.fillStyle = "#c9b27c";
        ctx.beginPath();
        ctx.moveTo(0, h);
        for (let x = 0; x <= w; x += 16) ctx.lineTo(x, h - 30 - Math.sin(x * 0.015) * 9 - Math.sin(x * 0.05) * 3);
        ctx.lineTo(w, h);
        ctx.fill();

        for (const c of coral) {
            ctx.strokeStyle = `hsl(${c.hue} 70% 58%)`;
            ctx.lineWidth = 7 * c.s;
            ctx.lineCap = "round";
            for (let b = -1; b <= 1; b++) {
                ctx.beginPath();
                ctx.moveTo(c.x, h - 26);
                ctx.quadraticCurveTo(c.x + b * 16 * c.s, h - 50 * c.s, c.x + b * 26 * c.s + Math.sin(t + c.x) * 3, h - 74 * c.s);
                ctx.stroke();
            }
        }

        ctx.strokeStyle = "#2fae62";
        ctx.lineWidth = 6;
        for (let i = 0; i < 10; i++) {
            const bx = (i + 0.2) * (w / 10);
            ctx.beginPath();
            ctx.moveTo(bx, h - 24);
            for (let s = 1; s <= 7; s++) {
                ctx.lineTo(bx + Math.sin(t * 1.2 + i + s * 0.6) * 9 * (s / 3), h - 24 - s * 20);
            }
            ctx.stroke();
        }

        // clicking a fish startles it, clicking the water drops food
        for (const c of p.clicks) {
            const hit = fish.find(f => Math.hypot(f.x - c.x, f.y - c.y) < (f.species?.size ?? 14) * 1.5);
            if (hit) {
                hit.dart = 1;
                hit.vx = -Math.sign(c.x - hit.x || 1) * Math.max(Math.abs(hit.vx), 40);
                hit.targetY = rand(60, h - 150);
                for (let i = 0; i < 5; i++) bubbles.push({ x: hit.x, y: hit.y, r: rand(2, 5), v: rand(40, 90), p: rand(0, 6) });
            } else {
                for (let i = 0; i < 4; i++) foods.push({ x: c.x + rand(-14, 14), y: c.y + rand(-8, 8), v: rand(18, 34) });
                for (let i = 0; i < 3; i++) bubbles.push({ x: c.x, y: c.y, r: rand(1.5, 3.5), v: rand(30, 60), p: rand(0, 6) });
            }
        }

        ctx.fillStyle = "#e9a24a";
        for (let i = foods.length - 1; i >= 0; i--) {
            const f = foods[i];
            f.y += f.v * dt;
            if (f.y > h - 36) { foods.splice(i, 1); continue; }
            ctx.beginPath();
            ctx.arc(f.x + Math.sin(t * 2 + i) * 2, f.y, 3, 0, Math.PI * 2);
            ctx.fill();
        }

        // fish: lazy wander, chase food when there is some
        for (const f of fish) {
            f.dart = Math.max(0, f.dart - dt);
            let food: { x: number; y: number; v: number; } | undefined;
            let best = 360;
            for (const fd of foods) {
                const d = Math.hypot(fd.x - f.x, fd.y - f.y);
                if (d < best) { best = d; food = fd; }
            }
            if (food && f.dart === 0) {
                f.vx = Math.sign(food.x - f.x || 1) * Math.max(Math.abs(f.vx), 80);
                f.targetY = food.y;
                if (best < (f.species?.size ?? 14) * 0.9) {
                    foods.splice(foods.indexOf(food), 1);
                    for (let i = 0; i < 3; i++) bubbles.push({ x: f.x + Math.sign(f.vx) * 12, y: f.y, r: rand(1.5, 3), v: rand(40, 70), p: rand(0, 6) });
                }
            }
            f.x += f.vx * (1 + f.dart * 4) * dt;
            f.y += (f.targetY - f.y) * (food ? 1.6 : 0.4) * dt + Math.sin(t * 1.4 + f.phase) * 6 * dt;
            if (!food && Math.abs(f.y - f.targetY) < 8 && Math.random() < dt * 0.5) f.targetY = rand(60, h - 150);
            if (f.x > w + 80) f.vx = -Math.abs(f.vx);
            if (f.x < -80) f.vx = Math.abs(f.vx);
            drawFish(ctx, f, t);
        }

        if (Math.random() < dt * 3) {
            bubbles.push({ x: rand(0, w), y: h - 30, r: rand(2, 6), v: rand(30, 60), p: rand(0, 6) });
        }
        ctx.strokeStyle = "rgba(255,255,255,0.55)";
        ctx.lineWidth = 1.2;
        for (let i = bubbles.length - 1; i >= 0; i--) {
            const b = bubbles[i];
            b.y -= b.v * dt;
            b.x += Math.sin(t * 3 + b.p) * 12 * dt;
            if (b.y < -10) { bubbles.splice(i, 1); continue; }
            ctx.beginPath();
            ctx.arc(b.x, b.y, b.r, 0, Math.PI * 2);
            ctx.stroke();
            ctx.fillStyle = "rgba(255,255,255,0.25)";
            ctx.beginPath();
            ctx.arc(b.x - b.r * 0.3, b.y - b.r * 0.3, b.r * 0.3, 0, Math.PI * 2);
            ctx.fill();
        }
    };
}

function fireplace(): Draw {
    interface P { x: number; y: number; vx: number; vy: number; life: number; max: number; r: number; ember: boolean; }
    const parts: P[] = [];
    let heat = 1;
    return (ctx, w, h, t, dt, p) => {
        // holding the pointer blows on the fire, clicking flings sparks
        heat += ((p.down ? 2.4 : 1) - heat) * Math.min(1, dt * 3);
        for (const c of p.clicks) {
            for (let i = 0; i < 30; i++) {
                parts.push({ x: c.x, y: c.y, vx: rand(-120, 120), vy: -rand(60, 260), life: 0, max: rand(1.2, 2.6), r: rand(1, 2.6), ember: true });
            }
        }

        ctx.fillStyle = "#0f0a08";
        ctx.fillRect(0, 0, w, h);

        const cx = w / 2;
        const base = h - 90;
        const flicker = 0.82 + Math.sin(t * 8.3) * 0.06 + Math.sin(t * 21) * 0.05 + Math.sin(t * 3.1) * 0.05;

        // brick wall lit by the fire
        ctx.save();
        for (let y = 0; y < h; y += 28) {
            for (let x = (y / 28) % 2 ? -30 : 0; x < w; x += 60) {
                const d = Math.hypot(x + 30 - cx, y - base);
                const lit = Math.max(0, 1 - d / (Math.max(w, h) * 0.6)) * flicker;
                ctx.fillStyle = `rgb(${30 + lit * 130 | 0},${18 + lit * 50 | 0},${14 + lit * 26 | 0})`;
                ctx.fillRect(x + 1, y + 1, 58, 26);
            }
        }
        ctx.restore();

        const glow = ctx.createRadialGradient(cx, base - 30, 10, cx, base - 30, Math.max(w, h) * 0.55);
        glow.addColorStop(0, `rgba(255,150,50,${Math.min(0.8, 0.42 * flicker * (0.7 + heat * 0.3))})`);
        glow.addColorStop(1, "rgba(255,100,20,0)");
        ctx.fillStyle = glow;
        ctx.fillRect(0, 0, w, h);

        // firebox
        ctx.fillStyle = "#050303";
        ctx.beginPath();
        ctx.moveTo(cx - 190, base + 70);
        ctx.lineTo(cx - 190, base - 150);
        ctx.quadraticCurveTo(cx, base - 230, cx + 190, base - 150);
        ctx.lineTo(cx + 190, base + 70);
        ctx.fill();
        ctx.strokeStyle = "#3b2d26";
        ctx.lineWidth = 14;
        ctx.stroke();

        // coals
        for (let i = 0; i < 14; i++) {
            const g = 0.5 + Math.sin(t * 2 + i) * 0.5;
            ctx.fillStyle = `rgb(${160 + g * 90 | 0},${40 + g * 50 | 0},10)`;
            ctx.beginPath();
            ctx.ellipse(cx - 120 + i * 18, base + 60, 14, 8, 0, 0, Math.PI * 2);
            ctx.fill();
        }

        // logs
        ctx.save();
        ctx.translate(cx, base + 40);
        for (const [rot, dx] of [[0.1, -10], [-0.14, 12], [0.02, 0]] as const) {
            ctx.save();
            ctx.rotate(rot);
            ctx.fillStyle = "#4a2c18";
            ctx.fillRect(-100 + dx, -11, 200, 22);
            ctx.fillStyle = `rgba(255,120,30,${0.25 * flicker})`;
            ctx.fillRect(-100 + dx, -11, 200, 8);
            ctx.restore();
        }
        ctx.restore();

        // flames + embers
        for (let i = 0; i < 170 * heat * dt + Math.random(); i++) {
            parts.push({ x: cx + rand(-70, 70), y: base + 40, vx: rand(-18, 18), vy: -rand(70, 150) * (0.8 + heat * 0.3), life: 0, max: rand(0.7, 1.5), r: rand(14, 26) * (0.8 + heat * 0.25), ember: false });
        }
        if (Math.random() < dt * 6) {
            parts.push({ x: cx + rand(-50, 50), y: base + 20, vx: rand(-40, 40), vy: -rand(90, 220), life: 0, max: rand(1.5, 3.2), r: rand(1, 2.4), ember: true });
        }

        ctx.globalCompositeOperation = "lighter";
        for (let i = parts.length - 1; i >= 0; i--) {
            const p = parts[i];
            p.life += dt;
            if (p.life >= p.max) { parts.splice(i, 1); continue; }
            const k = p.life / p.max;
            p.x += (p.vx + Math.sin(t * 6 + i) * (p.ember ? 22 : 12)) * dt;
            p.y += p.vy * dt;
            if (p.ember) {
                ctx.fillStyle = `rgba(255,${180 - k * 100 | 0},60,${1 - k})`;
                ctx.beginPath();
                ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
                ctx.fill();
                continue;
            }
            const rad = p.r * (1 - k * 0.65);
            const g = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, rad);
            g.addColorStop(0, `rgba(255,${235 - k * 150 | 0},${120 - k * 110 | 0},${0.5 * (1 - k)})`);
            g.addColorStop(1, "rgba(255,60,0,0)");
            ctx.fillStyle = g;
            ctx.beginPath();
            ctx.arc(p.x, p.y, rad, 0, Math.PI * 2);
            ctx.fill();
        }
        ctx.globalCompositeOperation = "source-over";

        // mantel
        ctx.fillStyle = "#2a1c14";
        ctx.fillRect(cx - 230, base - 190, 460, 24);
    };
}

function aurora(w: number, h: number): Draw {
    const stars = Array.from({ length: 160 }, () => ({ x: rand(0, w), y: rand(0, h * 0.7), r: rand(0.3, 1.4), p: rand(0, 6) }));
    let shooting: { x: number; y: number; vx: number; vy: number; life: number; } | null = null;
    const lines: { a: number; b: number; }[] = [];
    const rings: { x: number; y: number; t0: number; }[] = [];
    let selected = -1;
    let tilt = 0;

    return (ctx, w, h, t, dt, p) => {
        tilt += ((p.inside ? (p.x / w - 0.5) * 3 : 0) - tilt) * Math.min(1, dt * 2);

        // click a star to start a constellation, click another to connect them
        for (const c of p.clicks) {
            let idx = -1;
            let best = 28;
            stars.forEach((s, i) => {
                const d = Math.hypot(s.x - c.x, s.y - c.y);
                if (d < best) { best = d; idx = i; }
            });
            if (idx >= 0) {
                rings.push({ x: stars[idx].x, y: stars[idx].y, t0: t });
                if (selected >= 0 && selected !== idx) {
                    lines.push({ a: selected, b: idx });
                    if (lines.length > 60) lines.shift();
                }
                selected = idx;
            } else {
                selected = -1;
                shooting = { x: c.x, y: c.y, vx: -rand(300, 500), vy: rand(120, 220), life: 0 };
            }
        }

        const sky = ctx.createLinearGradient(0, 0, 0, h);
        sky.addColorStop(0, "#030614");
        sky.addColorStop(1, "#0b1c2e");
        ctx.fillStyle = sky;
        ctx.fillRect(0, 0, w, h);

        ctx.fillStyle = "#fff";
        for (const s of stars) {
            ctx.globalAlpha = 0.4 + Math.sin(t * 1.5 + s.p) * 0.35;
            ctx.beginPath();
            ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2);
            ctx.fill();
        }
        ctx.globalAlpha = 1;

        // curtains of light
        ctx.globalCompositeOperation = "lighter";
        for (let layer = 0; layer < 3; layer++) {
            const hue = [140, 170, 280][layer];
            for (let x = 0; x < w; x += 6) {
                const wave = Math.sin(x * 0.006 + t * 0.35 + layer * 2 + tilt) * 50 + Math.sin(x * 0.015 - t * 0.5 + layer) * 22;
                const top = h * 0.18 + layer * 24 + wave;
                const len = 140 + Math.sin(x * 0.01 + t * 0.7 + layer) * 70;
                const g = ctx.createLinearGradient(0, top, 0, top + len);
                g.addColorStop(0, `hsla(${hue},90%,60%,0)`);
                g.addColorStop(0.25, `hsla(${hue},90%,60%,0.2)`);
                g.addColorStop(1, `hsla(${hue},90%,50%,0)`);
                ctx.fillStyle = g;
                ctx.fillRect(x, top, 6, len);
            }
        }
        ctx.globalCompositeOperation = "source-over";

        if (!shooting && Math.random() < dt * 0.15) {
            shooting = { x: rand(w * 0.2, w), y: rand(0, h * 0.3), vx: -rand(300, 500), vy: rand(120, 220), life: 0 };
        }
        if (shooting) {
            shooting.life += dt;
            shooting.x += shooting.vx * dt;
            shooting.y += shooting.vy * dt;
            const g = ctx.createLinearGradient(shooting.x, shooting.y, shooting.x - shooting.vx * 0.15, shooting.y - shooting.vy * 0.15);
            g.addColorStop(0, "rgba(255,255,255,0.9)");
            g.addColorStop(1, "rgba(255,255,255,0)");
            ctx.strokeStyle = g;
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.moveTo(shooting.x, shooting.y);
            ctx.lineTo(shooting.x - shooting.vx * 0.15, shooting.y - shooting.vy * 0.15);
            ctx.stroke();
            if (shooting.life > 1.2) shooting = null;
        }

        ctx.strokeStyle = "rgba(190,225,255,0.6)";
        ctx.lineWidth = 1.2;
        for (const l of lines) {
            ctx.beginPath();
            ctx.moveTo(stars[l.a].x, stars[l.a].y);
            ctx.lineTo(stars[l.b].x, stars[l.b].y);
            ctx.stroke();
        }
        for (let i = rings.length - 1; i >= 0; i--) {
            const r = rings[i];
            const age = t - r.t0;
            if (age > 1.2) { rings.splice(i, 1); continue; }
            ctx.strokeStyle = `rgba(255,255,255,${1 - age / 1.2})`;
            ctx.beginPath();
            ctx.arc(r.x, r.y, 4 + age * 26, 0, Math.PI * 2);
            ctx.stroke();
        }
        if (selected >= 0) {
            ctx.strokeStyle = "rgba(255,240,170,0.9)";
            ctx.beginPath();
            ctx.arc(stars[selected].x, stars[selected].y, 7 + Math.sin(t * 5) * 1.5, 0, Math.PI * 2);
            ctx.stroke();
        }

        // mountains and a frozen lake
        const lake = h * 0.82;
        ctx.fillStyle = "#050b14";
        ctx.beginPath();
        ctx.moveTo(0, lake);
        for (let x = 0; x <= w; x += 10) ctx.lineTo(x, lake - 50 - Math.abs(Math.sin(x * 0.006 + 1)) * 110 - Math.sin(x * 0.03) * 6);
        ctx.lineTo(w, lake);
        ctx.fill();

        const lg = ctx.createLinearGradient(0, lake, 0, h);
        lg.addColorStop(0, "#0c2a3d");
        lg.addColorStop(1, "#06121d");
        ctx.fillStyle = lg;
        ctx.fillRect(0, lake, w, h - lake);
        ctx.globalAlpha = 0.18;
        ctx.fillStyle = "#5af0b0";
        for (let x = 0; x < w; x += 8) {
            ctx.fillRect(x, lake + 4 + Math.sin(x * 0.05 + t) * 3, 5, 2 + Math.sin(x * 0.02 + t * 0.6) * 1.5 + 1.5);
        }
        ctx.globalAlpha = 1;
    };
}

function rain(w: number, h: number): Draw {
    const lights = Array.from({ length: 26 }, () => ({
        x: rand(0, w), y: rand(h * 0.35, h), r: rand(14, 44),
        hue: [30, 45, 200, 340, 160][Math.floor(rand(0, 5))], p: rand(0, 6)
    }));
    interface Drop { x: number; y: number; r: number; v: number; wait: number; trail: number[]; }
    const drops: Drop[] = Array.from({ length: 70 }, () => ({
        x: rand(0, w), y: rand(0, h), r: rand(2, 6), v: 0, wait: rand(0, 6), trail: []
    }));

    // Warm breath fogs the glass; dragging wipes it clear and it slowly creeps back.
    const fog = document.createElement("canvas");
    fog.width = w;
    fog.height = h;
    const fctx = fog.getContext("2d")!;
    fctx.fillStyle = "rgba(196,210,230,0.62)";
    fctx.fillRect(0, 0, w, h);
    let regrow = 0;

    return (ctx, w, h, t, dt, p) => {
        if (p.down && p.inside) {
            fctx.globalCompositeOperation = "destination-out";
            fctx.lineCap = "round";
            fctx.lineWidth = 40;
            fctx.beginPath();
            fctx.moveTo(p.px, p.py);
            fctx.lineTo(p.x, p.y);
            fctx.stroke();
            fctx.globalCompositeOperation = "source-over";
            if (drops.length < 130 && Math.random() < dt * 14) {
                drops.push({ x: p.x + rand(-20, 20), y: p.y + rand(-20, 20), r: rand(2, 4), v: 0, wait: rand(0, 1.5), trail: [] });
            }
        }
        regrow += dt;
        if (regrow > 0.3) {
            regrow = 0;
            fctx.fillStyle = "rgba(196,210,230,0.03)";
            fctx.fillRect(0, 0, w, h);
        }

        const bg = ctx.createLinearGradient(0, 0, 0, h);
        bg.addColorStop(0, "#10151f");
        bg.addColorStop(1, "#1a1f2c");
        ctx.fillStyle = bg;
        ctx.fillRect(0, 0, w, h);

        // out of focus city lights
        ctx.globalCompositeOperation = "lighter";
        for (const l of lights) {
            const a = 0.28 + Math.sin(t * 0.8 + l.p) * 0.08;
            const g = ctx.createRadialGradient(l.x, l.y, 0, l.x, l.y, l.r);
            g.addColorStop(0, `hsla(${l.hue},90%,65%,${a})`);
            g.addColorStop(1, `hsla(${l.hue},90%,50%,0)`);
            ctx.fillStyle = g;
            ctx.beginPath();
            ctx.arc(l.x, l.y, l.r, 0, Math.PI * 2);
            ctx.fill();
        }
        ctx.globalCompositeOperation = "source-over";

        ctx.drawImage(fog, 0, 0, w, h);

        // drops sit, swell, then run down the glass leaving a trail
        for (const d of drops) {
            if (d.v === 0) {
                d.wait -= dt;
                d.r += dt * 0.15;
                if (d.wait < 0 && d.r > 3.5) { d.v = rand(40, 120); d.trail = []; }
            } else {
                d.trail.push(d.x, d.y);
                if (d.trail.length > 60) d.trail.splice(0, 2);
                d.y += d.v * dt;
                d.x += Math.sin(d.y * 0.05) * 6 * dt;
                d.v *= 1 - dt * 0.4;
                if (d.v < 12) { d.v = 0; d.wait = rand(1, 8); d.r = rand(2, 4); }
            }
            if (d.y > h + 10) { d.y = rand(-20, h * 0.3); d.x = rand(0, w); d.v = 0; d.wait = rand(0, 5); d.r = rand(2, 4); d.trail = []; }

            if (d.trail.length > 2) {
                ctx.strokeStyle = "rgba(200,220,255,0.12)";
                ctx.lineWidth = d.r * 0.6;
                ctx.beginPath();
                ctx.moveTo(d.trail[0], d.trail[1]);
                for (let i = 2; i < d.trail.length; i += 2) ctx.lineTo(d.trail[i], d.trail[i + 1]);
                ctx.stroke();
            }
            const g = ctx.createRadialGradient(d.x - d.r * 0.3, d.y - d.r * 0.3, 0, d.x, d.y, d.r);
            g.addColorStop(0, "rgba(255,255,255,0.55)");
            g.addColorStop(1, "rgba(150,180,220,0.18)");
            ctx.fillStyle = g;
            ctx.beginPath();
            ctx.ellipse(d.x, d.y, d.r * 0.85, d.r, 0, 0, Math.PI * 2);
            ctx.fill();
        }

        // fine mist of falling rain across the whole pane
        ctx.strokeStyle = "rgba(190,210,240,0.18)";
        ctx.lineWidth = 1;
        for (let i = 0; i < 40; i++) {
            const x = (i * 97.3 + t * 40) % w;
            const y = (i * 53.7 + t * 520) % h;
            ctx.beginPath();
            ctx.moveTo(x, y);
            ctx.lineTo(x - 3, y + 16);
            ctx.stroke();
        }
    };
}

// Soft noise bed: filtered noise for water and rain, plus random pops for the fire.
function createAmbience(scene: Scene) {
    const ctx = new AudioContext();
    const buffer = ctx.createBuffer(1, ctx.sampleRate * 2, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    let last = 0;
    for (let i = 0; i < data.length; i++) {
        const white = Math.random() * 2 - 1;
        // rain reads better as brighter noise, everything else as brown noise
        last = scene === "rain" ? white * 0.4 : (last + 0.02 * white) / 1.02;
        data[i] = scene === "rain" ? last : last * 3.5;
    }

    const src = ctx.createBufferSource();
    src.buffer = buffer;
    src.loop = true;
    const filter = ctx.createBiquadFilter();
    filter.type = "lowpass";
    filter.frequency.value = { aquarium: 500, fireplace: 900, aurora: 250, rain: 3500, zen: 300, fireflies: 400, lava: 180, galaxy: 140 }[scene];
    const gain = ctx.createGain();
    gain.gain.value = scene === "rain" ? 0.2 : scene === "aurora" ? 0.12 : 0.25;
    src.connect(filter).connect(gain).connect(ctx.destination);
    src.start();

    let pops: ReturnType<typeof setTimeout> | undefined;
    if (scene === "fireplace") {
        const crackle = () => {
            const pop = ctx.createBufferSource();
            pop.buffer = buffer;
            const hp = ctx.createBiquadFilter();
            hp.type = "highpass";
            hp.frequency.value = 2500;
            const g = ctx.createGain();
            g.gain.setValueAtTime(0.12 + Math.random() * 0.1, ctx.currentTime);
            g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.05);
            pop.connect(hp).connect(g).connect(ctx.destination);
            pop.start(0, Math.random());
            pop.stop(ctx.currentTime + 0.06);
            pops = setTimeout(crackle, 150 + Math.random() * 1200);
        };
        crackle();
    }

    return () => {
        clearTimeout(pops);
        ctx.close();
    };
}

const BUILDERS: Record<Scene, (w: number, h: number) => Draw> = {
    aquarium,
    fireplace: () => fireplace(),
    aurora,
    rain,
    zen,
    fireflies,
    lava,
    galaxy
};

export function Chill() {
    const [scene, setScene] = useState<Scene>("aquarium");
    const [sound, setSound] = useState(false);
    const canvasRef = useCanvas((w, h) => BUILDERS[scene](w, h), [scene]);

    useEffect(() => {
        if (!sound) return;
        return createAmbience(scene);
    }, [sound, scene]);

    return (
        <div className="vc-lounge-chill">
            <canvas ref={canvasRef} aria-label={SCENES.find(s => s.id === scene)!.label} />
            <div className="vc-lounge-hint">{HINTS[scene]}</div>
            <div className="vc-lounge-chill-bar">
                {SCENES.map(s => (
                    <button
                        key={s.id}
                        className="vc-lounge-btn"
                        data-variant={s.id === scene ? undefined : "secondary"}
                        onClick={() => setScene(s.id)}
                    >
                        {s.label}
                    </button>
                ))}
                <button className="vc-lounge-btn" data-variant="secondary" onClick={() => setSound(!sound)}>
                    Sound {sound ? "on" : "off"}
                </button>
            </div>
        </div>
    );
}
