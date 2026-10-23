/*
 * Vencord, a Discord client mod
 * Copyright (c) 2026 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import type { Draw } from "./useCanvas";

const rand = (a: number, b: number) => a + Math.random() * (b - a);

export function zen(w: number, h: number): Draw {
    const rocks = [
        { x: w * 0.3, y: h * 0.42, r: 36 },
        { x: w * 0.38, y: h * 0.55, r: 20 },
        { x: w * 0.7, y: h * 0.6, r: 44 },
        { x: w * 0.62, y: h * 0.34, r: 16 }
    ];

    const sand = document.createElement("canvas");
    sand.width = w;
    sand.height = h;
    const s = sand.getContext("2d")!;

    const smooth = () => {
        s.fillStyle = "#dccfa8";
        s.fillRect(0, 0, w, h);
        for (let i = 0; i < (w * h) / 50; i++) {
            s.fillStyle = Math.random() < 0.5 ? "rgba(255,255,255,0.2)" : "rgba(120,95,60,0.15)";
            s.fillRect(rand(0, w), rand(0, h), 1.5, 1.5);
        }
        // ripples already raked around each rock
        s.lineWidth = 2;
        for (const r of rocks) {
            for (let k = 1; k <= 5; k++) {
                s.strokeStyle = "rgba(120,95,60,0.4)";
                s.beginPath();
                s.arc(r.x, r.y, r.r + 8 + k * 11, 0, Math.PI * 2);
                s.stroke();
                s.strokeStyle = "rgba(255,250,230,0.55)";
                s.beginPath();
                s.arc(r.x + 1.5, r.y + 1.5, r.r + 8 + k * 11, 0, Math.PI * 2);
                s.stroke();
            }
        }
    };
    smooth();

    let lastClick = -1;
    let lastX = 0;
    let lastY = 0;

    return (ctx, w, h, t, dt, p) => {
        for (const c of p.clicks) {
            if (t - lastClick < 0.35 && Math.hypot(c.x - lastX, c.y - lastY) < 40) smooth();
            lastClick = t;
            lastX = c.x;
            lastY = c.y;
        }

        if (p.down && p.inside) {
            const dx = p.x - p.px;
            const dy = p.y - p.py;
            const len = Math.hypot(dx, dy);
            if (len > 0.5) {
                const nx = -dy / len;
                const ny = dx / len;
                s.lineCap = "round";
                for (let k = -2; k <= 2; k++) {
                    const ox = nx * k * 9;
                    const oy = ny * k * 9;
                    s.strokeStyle = "rgba(115,90,55,0.6)";
                    s.lineWidth = 3.5;
                    s.beginPath();
                    s.moveTo(p.px + ox, p.py + oy);
                    s.lineTo(p.x + ox, p.y + oy);
                    s.stroke();
                    s.strokeStyle = "rgba(255,250,232,0.65)";
                    s.lineWidth = 1.6;
                    s.beginPath();
                    s.moveTo(p.px + ox - nx * 2.5, p.py + oy - ny * 2.5);
                    s.lineTo(p.x + ox - nx * 2.5, p.y + oy - ny * 2.5);
                    s.stroke();
                }
            }
        }

        ctx.drawImage(sand, 0, 0, w, h);

        for (const r of rocks) {
            ctx.fillStyle = "rgba(60,45,25,0.28)";
            ctx.beginPath();
            ctx.ellipse(r.x + 8, r.y + r.r * 0.7, r.r * 1.1, r.r * 0.45, 0, 0, Math.PI * 2);
            ctx.fill();
            const g = ctx.createRadialGradient(r.x - r.r * 0.3, r.y - r.r * 0.4, 2, r.x, r.y, r.r * 1.1);
            g.addColorStop(0, "#9b9a94");
            g.addColorStop(1, "#4b4a47");
            ctx.fillStyle = g;
            ctx.beginPath();
            ctx.ellipse(r.x, r.y, r.r, r.r * 0.82, 0.2, 0, Math.PI * 2);
            ctx.fill();
            ctx.fillStyle = "rgba(90,130,70,0.55)";
            ctx.beginPath();
            ctx.ellipse(r.x - r.r * 0.2, r.y - r.r * 0.5, r.r * 0.5, r.r * 0.2, 0.2, 0, Math.PI * 2);
            ctx.fill();
        }

        if (p.inside) {
            ctx.strokeStyle = "rgba(80,60,35,0.6)";
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.moveTo(p.x - 30, p.y);
            ctx.lineTo(p.x + 30, p.y);
            for (let k = -2; k <= 2; k++) {
                ctx.moveTo(p.x + k * 9, p.y);
                ctx.lineTo(p.x + k * 9, p.y + 12);
            }
            ctx.stroke();
        }
    };
}

export function fireflies(w: number, h: number): Draw {
    interface Fly { x: number; y: number; vx: number; vy: number; a: number; p: number; hue: number; }
    const make = (x = rand(0, w), y = rand(h * 0.2, h * 0.9)): Fly => ({
        x, y, vx: 0, vy: 0, a: rand(0, 6.28), p: rand(0, 6.28), hue: rand(55, 95)
    });
    const flies = Array.from({ length: 55 }, () => make());
    const grass = Array.from({ length: Math.ceil(w / 7) }, (_, i) => ({ x: i * 7 + rand(-2, 2), h: rand(40, 120), p: rand(0, 6.28) }));

    return (ctx, w, h, t, dt, p) => {
        const bg = ctx.createLinearGradient(0, 0, 0, h);
        bg.addColorStop(0, "#050a18");
        bg.addColorStop(0.7, "#0d1d22");
        bg.addColorStop(1, "#0a1612");
        ctx.fillStyle = bg;
        ctx.fillRect(0, 0, w, h);

        // moon and a ridge of trees
        ctx.save();
        ctx.shadowColor = "#cfd8ff";
        ctx.shadowBlur = 40;
        ctx.fillStyle = "#eef1ff";
        ctx.beginPath();
        ctx.arc(w * 0.8, h * 0.17, 26, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();

        ctx.fillStyle = "#07100f";
        for (let x = 0; x < w; x += 26) {
            const th = 80 + Math.abs(Math.sin(x * 0.07)) * 70;
            ctx.beginPath();
            ctx.moveTo(x, h * 0.62);
            ctx.lineTo(x + 13, h * 0.62 - th);
            ctx.lineTo(x + 26, h * 0.62);
            ctx.fill();
        }
        ctx.fillRect(0, h * 0.62 - 2, w, h);

        // lantern glow under the pointer
        if (p.inside) {
            const g = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, 120);
            g.addColorStop(0, "rgba(255,230,150,0.18)");
            g.addColorStop(1, "rgba(255,230,150,0)");
            ctx.fillStyle = g;
            ctx.fillRect(p.x - 120, p.y - 120, 240, 240);
        }

        for (const c of p.clicks) {
            for (let i = 0; i < 10 && flies.length < 140; i++) {
                const f = make(c.x, c.y);
                f.vx = rand(-140, 140);
                f.vy = rand(-140, 140);
                flies.push(f);
            }
        }

        ctx.globalCompositeOperation = "lighter";
        for (const f of flies) {
            f.a += rand(-1, 1) * dt * 4;
            f.vx += Math.cos(f.a) * 60 * dt;
            f.vy += Math.sin(f.a) * 60 * dt;
            if (p.inside) {
                const dx = p.x - f.x;
                const dy = p.y - f.y;
                const d = Math.hypot(dx, dy);
                if (d < 320 && d > 24) {
                    f.vx += (dx / d) * 90 * dt;
                    f.vy += (dy / d) * 90 * dt;
                }
            }
            if (f.y > h * 0.88) f.vy -= 120 * dt;
            if (f.y < h * 0.12) f.vy += 120 * dt;
            f.vx *= 1 - dt * 1.2;
            f.vy *= 1 - dt * 1.2;
            f.x = (f.x + f.vx * dt + w) % w;
            f.y += f.vy * dt;

            const blink = Math.max(0, Math.sin(t * 1.7 + f.p));
            const alpha = 0.15 + blink * blink * 0.85;
            const g = ctx.createRadialGradient(f.x, f.y, 0, f.x, f.y, 18);
            g.addColorStop(0, `hsla(${f.hue},100%,70%,${alpha})`);
            g.addColorStop(1, `hsla(${f.hue},100%,60%,0)`);
            ctx.fillStyle = g;
            ctx.beginPath();
            ctx.arc(f.x, f.y, 18, 0, Math.PI * 2);
            ctx.fill();
        }
        ctx.globalCompositeOperation = "source-over";

        // grass leaning away from the pointer
        ctx.strokeStyle = "#04100c";
        ctx.lineWidth = 2.5;
        const base = h + 4;
        for (const g of grass) {
            let lean = Math.sin(t * 1.3 + g.p) * 8;
            if (p.inside) {
                const dx = g.x - p.x;
                const dy = base - g.h * 0.5 - p.y;
                if (Math.abs(dx) < 90 && Math.abs(dy) < 120) lean += Math.sign(dx || 1) * (1 - Math.abs(dx) / 90) * 26;
            }
            ctx.beginPath();
            ctx.moveTo(g.x, base);
            ctx.quadraticCurveTo(g.x + lean * 0.3, base - g.h * 0.6, g.x + lean, base - g.h);
            ctx.stroke();
        }
    };
}

export function lava(w: number, h: number): Draw {
    const lampW = Math.min(w * 0.36, 300);
    const lx = w / 2 - lampW / 2;
    const top = 28;
    const bottom = h - 48;
    const blobs = Array.from({ length: 9 }, () => ({
        x: w / 2 + rand(-lampW * 0.25, lampW * 0.25),
        y: rand(top + 60, bottom - 60),
        r: rand(26, 58),
        vy: 0,
        heat: rand(0.2, 0.8),
        p: rand(0, 6)
    }));
    let hue = 335;

    return (ctx, w, h, t, dt, p) => {
        for (const c of p.clicks) {
            hue = (hue + 55) % 360;
            for (const b of blobs) if (Math.hypot(b.x - c.x, b.y - c.y) < 160) { b.heat = 1; b.vy -= 160; }
        }

        const bg = ctx.createRadialGradient(w / 2, h / 2, 40, w / 2, h / 2, Math.max(w, h) * 0.7);
        bg.addColorStop(0, `hsl(${hue} 55% 14%)`);
        bg.addColorStop(1, "#06050a");
        ctx.fillStyle = bg;
        ctx.fillRect(0, 0, w, h);

        // glass
        ctx.save();
        ctx.beginPath();
        ctx.moveTo(lx + lampW * 0.12, top);
        ctx.lineTo(lx + lampW * 0.88, top);
        ctx.lineTo(lx + lampW, bottom);
        ctx.lineTo(lx, bottom);
        ctx.closePath();
        ctx.clip();

        const liquid = ctx.createLinearGradient(0, top, 0, bottom);
        liquid.addColorStop(0, `hsl(${hue + 20} 70% 18%)`);
        liquid.addColorStop(1, `hsl(${hue} 80% 30%)`);
        ctx.fillStyle = liquid;
        ctx.fillRect(lx, top, lampW, bottom - top);

        ctx.globalCompositeOperation = "lighter";
        for (const b of blobs) {
            if (p.down && p.inside) {
                b.x += (p.x - b.x) * Math.min(1, dt * 2.2) * (Math.hypot(p.x - b.x, p.y - b.y) < 200 ? 1 : 0);
                b.y += (p.y - b.y) * Math.min(1, dt * 2.2) * (Math.hypot(p.x - b.x, p.y - b.y) < 200 ? 1 : 0);
            }
            if (b.y > bottom - 90) b.heat = Math.min(1, b.heat + dt * 0.45);
            else if (b.y < top + 90) b.heat = Math.max(0, b.heat - dt * 0.45);
            b.vy += (0.5 - b.heat) * 90 * dt;
            b.vy *= 1 - dt * 0.8;
            b.y += b.vy * dt;
            b.y = Math.min(bottom - b.r * 0.6, Math.max(top + b.r * 0.6, b.y));
            b.x += Math.sin(t * 0.5 + b.p) * 12 * dt;
            b.x = Math.min(lx + lampW - b.r * 0.6, Math.max(lx + b.r * 0.6, b.x));

            const squash = 1 + Math.sin(t * 1.4 + b.p) * 0.06;
            const g = ctx.createRadialGradient(b.x, b.y, 0, b.x, b.y, b.r * 1.15);
            g.addColorStop(0, `hsla(${hue + 25},100%,68%,0.95)`);
            g.addColorStop(0.7, `hsla(${hue + 10},95%,52%,0.7)`);
            g.addColorStop(1, `hsla(${hue},90%,45%,0)`);
            ctx.fillStyle = g;
            ctx.beginPath();
            ctx.ellipse(b.x, b.y, b.r * 1.1 / squash, b.r * 1.1 * squash, 0, 0, Math.PI * 2);
            ctx.fill();
        }
        ctx.globalCompositeOperation = "source-over";

        // glass highlight
        const hl = ctx.createLinearGradient(lx, 0, lx + lampW, 0);
        hl.addColorStop(0, "rgba(255,255,255,0.18)");
        hl.addColorStop(0.2, "rgba(255,255,255,0)");
        hl.addColorStop(0.8, "rgba(255,255,255,0)");
        hl.addColorStop(1, "rgba(255,255,255,0.1)");
        ctx.fillStyle = hl;
        ctx.fillRect(lx, top, lampW, bottom - top);
        ctx.restore();

        // base and cap
        ctx.fillStyle = "#2b2530";
        ctx.beginPath();
        ctx.moveTo(lx - 10, bottom);
        ctx.lineTo(lx + lampW + 10, bottom);
        ctx.lineTo(lx + lampW * 0.85, h - 6);
        ctx.lineTo(lx + lampW * 0.15, h - 6);
        ctx.fill();
        ctx.fillStyle = "#3a3340";
        ctx.fillRect(lx + lampW * 0.1, top - 16, lampW * 0.8, 16);
    };
}

export function galaxy(w: number, h: number): Draw {
    interface Star { a: number; r: number; w: number; ox: number; oy: number; vx: number; vy: number; hue: number; s: number; }
    const cx = w / 2;
    const cy = h / 2;
    const maxR = Math.min(w, h) * 0.46;
    const stars: Star[] = Array.from({ length: 1300 }, () => {
        const r = Math.pow(Math.random(), 0.65) * maxR;
        const arm = Math.floor(Math.random() * 3);
        return {
            a: arm * 2.094 + r * 0.018 + rand(-0.3, 0.3),
            r,
            w: 22 / (30 + r) * rand(0.9, 1.1),
            ox: 0, oy: 0, vx: 0, vy: 0,
            hue: 200 + (r / maxR) * 130 + rand(-15, 15),
            s: rand(0.8, 2)
        };
    });

    return (ctx, w, h, t, dt, p) => {
        ctx.fillStyle = "rgba(3,3,12,0.28)";
        ctx.fillRect(0, 0, w, h);

        for (const c of p.clicks) {
            for (const s of stars) {
                const x = cx + Math.cos(s.a) * s.r + s.ox;
                const y = cy + Math.sin(s.a) * s.r * 0.62 + s.oy;
                const d = Math.hypot(x - c.x, y - c.y);
                if (d < 340) {
                    const k = (1 - d / 340) * 420;
                    s.vx += ((x - c.x) / (d || 1)) * k;
                    s.vy += ((y - c.y) / (d || 1)) * k;
                }
            }
            ctx.fillStyle = "rgba(255,255,255,0.8)";
            ctx.beginPath();
            ctx.arc(c.x, c.y, 24, 0, Math.PI * 2);
            ctx.fill();
        }

        const core = ctx.createRadialGradient(cx, cy, 0, cx, cy, 90);
        core.addColorStop(0, "rgba(255,230,190,0.55)");
        core.addColorStop(1, "rgba(255,200,150,0)");
        ctx.fillStyle = core;
        ctx.fillRect(cx - 90, cy - 90, 180, 180);

        ctx.globalCompositeOperation = "lighter";
        for (const s of stars) {
            s.a += s.w * dt;
            let x = cx + Math.cos(s.a) * s.r + s.ox;
            let y = cy + Math.sin(s.a) * s.r * 0.62 + s.oy;

            if (p.down && p.inside) {
                const dx = p.x - x;
                const dy = p.y - y;
                const d = Math.hypot(dx, dy);
                if (d < 260 && d > 6) {
                    s.vx += (dx / d) * 520 * dt;
                    s.vy += (dy / d) * 520 * dt;
                }
            }
            s.ox += s.vx * dt;
            s.oy += s.vy * dt;
            s.vx *= 1 - dt * 1.6;
            s.vy *= 1 - dt * 1.6;
            // drift back onto the orbit
            s.ox *= 1 - dt * 0.35;
            s.oy *= 1 - dt * 0.35;

            x = cx + Math.cos(s.a) * s.r + s.ox;
            y = cy + Math.sin(s.a) * s.r * 0.62 + s.oy;
            ctx.fillStyle = `hsla(${s.hue},90%,${65 + Math.sin(t * 2 + s.r) * 10}%,0.9)`;
            ctx.fillRect(x, y, s.s, s.s);
        }
        ctx.globalCompositeOperation = "source-over";
    };
}
