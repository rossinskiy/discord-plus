/*
 * Vencord, a Discord client mod
 * Copyright (c) 2026 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { RARITY_COLOR, Species } from "./game";
import { Draw, useCanvas } from "./useCanvas";

// Written by the Fishing tab, read every frame by the pond.
export const pond: {
    phase: "idle" | "waiting" | "bite";
    catch: { species: Species; at: number; } | null;
    missAt: number;
} = { phase: "idle", catch: null, missAt: 0 };

const rand = (a: number, b: number) => a + Math.random() * (b - a);

export function PondCanvas() {
    const ref = useCanvas((w, h) => {
        const waterY = h * 0.32;
        const bx = w / 2;
        const by = waterY + h * 0.2;
        const ripples: { x: number; y: number; born: number; }[] = [];
        const splash: { x: number; y: number; vx: number; vy: number; life: number; }[] = [];
        const swimmers = Array.from({ length: 7 }, () => ({
            x: rand(0, w), y: rand(waterY + 50, h - 20), v: rand(14, 36) * (Math.random() < 0.5 ? -1 : 1),
            s: rand(7, 16), p: rand(0, 6)
        }));
        const reeds = Array.from({ length: 9 }, (_, i) => ({ x: (i % 2 ? w - 10 - i * 7 : 8 + i * 7), s: rand(0.8, 1.3), p: rand(0, 6) }));
        const stars = Array.from({ length: 40 }, () => ({ x: rand(0, w), y: rand(0, waterY - 10), r: rand(0.3, 1.1), p: rand(0, 6) }));
        let lastPhase = pond.phase;
        let lastRipple = 0;
        let seenCatch = pond.catch;
        let seenMiss = pond.missAt;

        const draw: Draw = (ctx, w, h, t, dt) => {
            // dusk sky
            const sky = ctx.createLinearGradient(0, 0, 0, waterY);
            sky.addColorStop(0, "#27264f");
            sky.addColorStop(0.7, "#b4577a");
            sky.addColorStop(1, "#f4a373");
            ctx.fillStyle = sky;
            ctx.fillRect(0, 0, w, waterY + 1);

            ctx.fillStyle = "#fff";
            for (const s of stars) {
                ctx.globalAlpha = 0.35 + Math.sin(t * 2 + s.p) * 0.3;
                ctx.beginPath();
                ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2);
                ctx.fill();
            }
            ctx.globalAlpha = 1;

            // sun on the horizon
            ctx.fillStyle = "#ffd9a0";
            ctx.beginPath();
            ctx.arc(w * 0.72, waterY, 26, Math.PI, 0);
            ctx.fill();

            // far shore
            ctx.fillStyle = "#2a1f3a";
            ctx.beginPath();
            ctx.moveTo(0, waterY);
            for (let x = 0; x <= w; x += 12) ctx.lineTo(x, waterY - 10 - Math.sin(x * 0.02 + 2) * 8);
            ctx.lineTo(w, waterY);
            ctx.fill();

            // water
            const water = ctx.createLinearGradient(0, waterY, 0, h);
            water.addColorStop(0, "#e69a7a");
            water.addColorStop(0.18, "#3d7aa6");
            water.addColorStop(1, "#0d2d4a");
            ctx.fillStyle = water;
            ctx.fillRect(0, waterY, w, h - waterY);

            // glitter lane under the sun
            ctx.fillStyle = "rgba(255,230,180,0.6)";
            for (let i = 0; i < 26; i++) {
                const y = waterY + 4 + i * 5;
                const half = 4 + i * 1.6;
                const x = w * 0.72 + Math.sin(t * 2 + i * 1.7) * half;
                ctx.fillRect(x - half * 0.4, y, half * 0.8, 1.5);
            }

            // swimming fish silhouettes
            for (const f of swimmers) {
                f.x += f.v * dt;
                if (f.x > w + 30) f.x = -30;
                if (f.x < -30) f.x = w + 30;
                const wag = Math.sin(t * 6 + f.p) * 0.35;
                ctx.save();
                ctx.translate(f.x, f.y + Math.sin(t + f.p) * 3);
                ctx.scale(f.v > 0 ? 1 : -1, 1);
                ctx.fillStyle = "rgba(6,24,44,0.45)";
                ctx.beginPath();
                ctx.ellipse(0, 0, f.s, f.s * 0.45, 0, 0, Math.PI * 2);
                ctx.fill();
                ctx.beginPath();
                ctx.moveTo(-f.s * 0.8, 0);
                ctx.lineTo(-f.s * 1.4, -f.s * 0.4 + wag * f.s * 0.4);
                ctx.lineTo(-f.s * 1.4, f.s * 0.4 + wag * f.s * 0.4);
                ctx.fill();
                ctx.restore();
            }

            // phase changes spawn ripples
            if (pond.phase !== lastPhase) {
                if (pond.phase === "waiting") for (let i = 0; i < 3; i++) ripples.push({ x: bx, y: by, born: t + i * 0.15 });
                lastPhase = pond.phase;
            }
            if (pond.phase === "bite" && t - lastRipple > 0.18) {
                ripples.push({ x: bx, y: by, born: t });
                lastRipple = t;
            }
            if (pond.phase === "waiting" && t - lastRipple > 1.8) {
                ripples.push({ x: bx, y: by, born: t });
                lastRipple = t;
            }

            // a catch throws a splash and a fish arcing out of the water
            if (pond.catch && pond.catch !== seenCatch) {
                seenCatch = pond.catch;
                for (let i = 0; i < 26; i++) {
                    splash.push({ x: bx, y: by, vx: rand(-90, 90), vy: -rand(120, 300), life: 0 });
                }
                for (let i = 0; i < 3; i++) ripples.push({ x: bx, y: by, born: t + i * 0.1 });
            }
            if (pond.missAt !== seenMiss) {
                seenMiss = pond.missAt;
                ripples.push({ x: bx, y: by, born: t });
            }

            ctx.lineWidth = 1.5;
            for (let i = ripples.length - 1; i >= 0; i--) {
                const r = ripples[i];
                const age = t - r.born;
                if (age > 2.2) { ripples.splice(i, 1); continue; }
                if (age < 0) continue;
                ctx.strokeStyle = `rgba(255,255,255,${0.5 * (1 - age / 2.2)})`;
                ctx.beginPath();
                ctx.ellipse(r.x, r.y, 6 + age * 38, (6 + age * 38) * 0.35, 0, 0, Math.PI * 2);
                ctx.stroke();
            }

            // line and bobber
            if (pond.phase !== "idle") {
                const dunk = pond.phase === "bite" ? Math.abs(Math.sin(t * 14)) * 14 : Math.sin(t * 2) * 2.5;
                const y = by + dunk;
                ctx.strokeStyle = "rgba(255,255,255,0.55)";
                ctx.lineWidth = 1;
                ctx.beginPath();
                ctx.moveTo(w * 0.1, -10);
                ctx.quadraticCurveTo(w * 0.3, y - 120, bx, y - 8);
                ctx.stroke();

                ctx.fillStyle = "#fff";
                ctx.beginPath();
                ctx.arc(bx, y, 8, 0, Math.PI * 2);
                ctx.fill();
                ctx.fillStyle = "#e8412c";
                ctx.beginPath();
                ctx.arc(bx, y, 8, Math.PI, 0);
                ctx.fill();

                if (pond.phase === "bite") {
                    ctx.fillStyle = "#ffd23a";
                    ctx.strokeStyle = "#7a5200";
                    ctx.lineWidth = 3;
                    ctx.font = "bold 34px sans-serif";
                    ctx.textAlign = "center";
                    const bounce = Math.sin(t * 16) * 4;
                    ctx.strokeText("!", bx, y - 34 + bounce);
                    ctx.fillText("!", bx, y - 34 + bounce);
                }
            }

            // jumping catch
            if (pond.catch) {
                const age = (performance.now() - pond.catch.at) / 1000;
                if (age < 1.6) {
                    const sp = pond.catch.species;
                    const x = bx + age * 30;
                    const y = by - Math.sin((age / 1.6) * Math.PI) * 120;
                    ctx.save();
                    ctx.translate(x, y);
                    ctx.rotate(-0.6 + age * 1.1);
                    ctx.shadowColor = RARITY_COLOR[sp.rarity];
                    ctx.shadowBlur = sp.rarity === "common" ? 0 : 20;
                    ctx.fillStyle = sp.color;
                    ctx.beginPath();
                    ctx.ellipse(0, 0, sp.size, sp.size * 0.5, 0, 0, Math.PI * 2);
                    ctx.fill();
                    ctx.fillStyle = sp.accent;
                    ctx.beginPath();
                    ctx.moveTo(-sp.size * 0.8, 0);
                    ctx.lineTo(-sp.size * 1.4, -sp.size * 0.45);
                    ctx.lineTo(-sp.size * 1.4, sp.size * 0.45);
                    ctx.fill();
                    ctx.restore();
                }
            }

            ctx.fillStyle = "rgba(255,255,255,0.85)";
            for (let i = splash.length - 1; i >= 0; i--) {
                const p = splash[i];
                p.life += dt;
                if (p.life > 1) { splash.splice(i, 1); continue; }
                p.vy += 700 * dt;
                p.x += p.vx * dt;
                p.y += p.vy * dt;
                ctx.globalAlpha = 1 - p.life;
                ctx.beginPath();
                ctx.arc(p.x, p.y, 2.4, 0, Math.PI * 2);
                ctx.fill();
            }
            ctx.globalAlpha = 1;

            // reeds in front
            ctx.strokeStyle = "#1b3a2a";
            ctx.lineWidth = 3;
            for (const r of reeds) {
                ctx.beginPath();
                ctx.moveTo(r.x, h);
                ctx.quadraticCurveTo(r.x + Math.sin(t + r.p) * 5, h - 60 * r.s, r.x + Math.sin(t * 1.2 + r.p) * 10, h - 110 * r.s);
                ctx.stroke();
            }
        };

        return draw;
    });

    return <canvas ref={ref} className="vc-lounge-pondcanvas" aria-hidden="true" />;
}
