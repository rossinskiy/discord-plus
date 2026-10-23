/*
 * Vencord, a Discord client mod
 * Copyright (c) 2026 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { useRef, useState } from "@webpack/common";

import { held } from "./input";
import { tone } from "./sfx";
import { readStat, writeStat } from "./storage";
import { Draw, useCanvas } from "./useCanvas";

interface Stats { best: number; deaths: number; }

interface Platform {
    x: number;
    y: number;
    w: number;
    kind: "solid" | "moving" | "crumble";
    baseX: number;
    range: number;
    speed: number;
    phase: number;
    spikes: boolean;
    checkpoint: boolean;
    crumble: number;
    dx: number;
}

const GRAVITY = 2300;
const RUN = 380;
const JUMP = 800;
const PW = 22;
const PH = 38;
const THICK = 26;
const WORLD_BOTTOM = 820;

const rand = (a: number, b: number) => a + Math.random() * (b - a);

export function Parkour() {
    const [stats, setStats] = useState<Stats>(() => readStat<Stats>("parkour", { best: 0, deaths: 0 }));
    const live = useRef(stats);
    live.current = stats;

    const ref = useCanvas((w, h) => {
        const platforms: Platform[] = [];
        let lastX = 0;
        let lastY = 520;
        let index = 0;

        const make = (x: number, y: number, width: number): Platform => {
            index++;
            const diff = Math.min(1, x / 12000);
            const roll = Math.random();
            const kind: Platform["kind"] = index < 3 ? "solid" : roll < 0.14 + diff * 0.08 ? "moving" : roll < 0.28 + diff * 0.1 ? "crumble" : "solid";
            return {
                x, y, w: width, kind, baseX: x,
                range: kind === "moving" ? rand(60, 110) : 0,
                speed: rand(0.8, 1.5),
                phase: rand(0, 6),
                spikes: kind === "solid" && width > 190 && index > 4 && Math.random() < 0.2 + diff * 0.15,
                checkpoint: index % 12 === 0,
                crumble: 0, dx: 0
            };
        };

        platforms.push(make(-200, 520, 700));
        lastX = 500;

        const fill = (limit: number) => {
            while (lastX < limit) {
                const diff = Math.min(1, lastX / 12000);
                const gap = rand(70, 130 + diff * 60);
                const width = rand(130 - diff * 30, 260);
                const y = Math.min(640, Math.max(300, lastY + rand(-85, 85)));
                const p = make(lastX + gap, y, width);
                platforms.push(p);
                lastX = p.x + p.w + (p.kind === "moving" ? p.range : 0);
                lastY = y;
            }
        };
        fill(2400);

        let px = 100;
        let py = 520 - PH;
        let vx = 0;
        let vy = 0;
        let grounded = false;
        let onPlatform: Platform | null = null;
        let coyote = 0;
        let buffer = 0;
        let jumpHeld = false;
        let facing = 1;
        let cam = 0;
        let camY = 0;
        let spawn = { x: 100, y: 520 - PH };
        let bestRun = live.current.best;
        let flash = 0;
        let anim = 0;
        const dust: { x: number; y: number; vx: number; vy: number; life: number; }[] = [];

        const skyline = Array.from({ length: 40 }, (_, i) => ({ w: rand(50, 120), h: rand(80, 300), x: i * 110 }));

        const die = () => {
            const cur = live.current;
            const next = { best: cur.best, deaths: cur.deaths + 1 };
            writeStat("parkour", next);
            setStats(next);
            tone(180, 0.15, 0.25, "sawtooth", 0.3);
            px = spawn.x;
            py = spawn.y;
            vx = 0;
            vy = 0;
            flash = 1;
            for (const p of platforms) if (p.kind === "crumble") p.crumble = 0;
        };

        const draw: Draw = (ctx, w, h, t, dt) => {
            // controls
            const left = held("arrowleft", "a");
            const right = held("arrowright", "d");
            const jump = held("space", "arrowup", "w");
            const dir = (right ? 1 : 0) - (left ? 1 : 0);
            if (dir) facing = dir;

            const accel = grounded ? 2800 : 1800;
            const target = dir * RUN;
            vx += Math.sign(target - vx) * Math.min(Math.abs(target - vx), accel * dt);
            if (!dir && grounded) vx *= 1 - Math.min(1, dt * 12);

            coyote = grounded ? 0.1 : coyote - dt;
            buffer = jump && !jumpHeld ? 0.12 : buffer - dt;
            if (buffer > 0 && coyote > 0) {
                vy = -JUMP;
                grounded = false;
                coyote = 0;
                buffer = 0;
                tone(420, 0.06, 0.1, "triangle", 1.8);
                for (let i = 0; i < 5; i++) dust.push({ x: px + PW / 2, y: py + PH, vx: rand(-60, 60), vy: -rand(10, 60), life: 0 });
            }
            // letting go early makes a shorter hop
            if (!jump && vy < -250) vy *= 1 - Math.min(1, dt * 10);
            jumpHeld = jump;

            vy += GRAVITY * dt;

            // move platforms first so the player can ride them
            for (const p of platforms) {
                if (p.kind === "moving") {
                    const nx = p.baseX + Math.sin(t * p.speed + p.phase) * p.range;
                    p.dx = nx - p.x;
                    p.x = nx;
                }
                if (p.kind === "crumble" && p.crumble > 0) p.crumble += dt;
            }
            if (onPlatform) px += onPlatform.dx;

            // horizontal
            px += vx * dt;
            for (const p of platforms) {
                if (p.crumble > 0.6) continue;
                const top = p.y;
                if (py + PH > top + 4 && py < top + THICK && px + PW > p.x && px < p.x + p.w) {
                    if (vx > 0) px = p.x - PW;
                    else if (vx < 0) px = p.x + p.w;
                    else px = px + PW / 2 < p.x + p.w / 2 ? p.x - PW : p.x + p.w;
                    vx = 0;
                }
            }

            // vertical
            const prevY = py;
            py += vy * dt;
            grounded = false;
            onPlatform = null;
            for (const p of platforms) {
                if (p.crumble > 0.6) continue;
                if (px + PW > p.x && px < p.x + p.w) {
                    if (vy >= 0 && prevY + PH <= p.y + 6 && py + PH >= p.y) {
                        py = p.y - PH;
                        if (vy > 400) {
                            tone(130, 0.08, 0.08, "triangle", 0.5);
                            for (let i = 0; i < 6; i++) dust.push({ x: px + PW / 2, y: p.y, vx: rand(-90, 90), vy: -rand(10, 70), life: 0 });
                        }
                        vy = 0;
                        grounded = true;
                        onPlatform = p;
                        if (p.kind === "crumble" && p.crumble === 0) p.crumble = 0.001;
                        if (p.checkpoint && spawn.x !== p.x + p.w / 2 - PW / 2) {
                            spawn = { x: p.x + p.w / 2 - PW / 2, y: p.y - PH };
                            tone(660, 0.08, 0.2, "triangle", 1.5);
                        }
                        if (p.spikes && px + PW > p.x + p.w * 0.3 && px < p.x + p.w * 0.7) die();
                    } else if (vy < 0 && prevY >= p.y + THICK - 4 && py <= p.y + THICK) {
                        py = p.y + THICK;
                        vy = 0;
                    }
                }
            }
            if (py > WORLD_BOTTOM) die();
            if (px < -150) { px = -150; vx = 0; }

            const meters = Math.max(0, Math.floor((px - 100) / 40));
            if (meters > bestRun) {
                bestRun = meters;
                const cur = live.current;
                if (meters % 5 === 0) {
                    const next = { best: meters, deaths: cur.deaths };
                    writeStat("parkour", next);
                    setStats(next);
                }
            }

            fill(px + w * 1.4);
            while (platforms.length && platforms[0].x + platforms[0].w < px - w) platforms.shift();

            cam += (px - w * 0.35 - cam) * Math.min(1, dt * 6);
            camY += (py - h * 0.6 - camY) * Math.min(1, dt * 3);
            anim += Math.abs(vx) * dt * 0.05;

            // sky and skyline
            const sky = ctx.createLinearGradient(0, 0, 0, h);
            sky.addColorStop(0, "#241a4a");
            sky.addColorStop(0.6, "#b4506e");
            sky.addColorStop(1, "#f0a070");
            ctx.fillStyle = sky;
            ctx.fillRect(0, 0, w, h);

            ctx.fillStyle = "#fff6d8";
            ctx.beginPath();
            ctx.arc(w * 0.78, h * 0.28, 34, 0, Math.PI * 2);
            ctx.fill();

            for (const [layer, color, speed] of [[0, "#4a2f5e", 0.2], [1, "#2d1d40", 0.4]] as const) {
                ctx.fillStyle = color;
                for (const b of skyline) {
                    const x = ((b.x * (1 + layer * 0.3) - cam * speed) % (skyline.length * 110)) - 100;
                    const wrapped = x < -200 ? x + skyline.length * 110 : x;
                    ctx.fillRect(wrapped, h - b.h * (0.6 + layer * 0.4) - camY * speed * 0.2 - 40, b.w, b.h * 2);
                }
            }

            ctx.save();
            ctx.translate(-cam, -camY);

            for (const p of platforms) {
                const fall = p.crumble > 0.4 ? (p.crumble - 0.4) * 400 : 0;
                const shake = p.crumble > 0 && p.crumble < 0.6 ? Math.sin(t * 60) * 1.5 : 0;
                const x = p.x + shake;
                const y = p.y + fall * (p.crumble - 0.4 > 0 ? (p.crumble - 0.4) * 2 : 0);
                if (p.crumble > 1.4) continue;
                ctx.fillStyle = p.kind === "crumble" ? "#6b4a3a" : p.kind === "moving" ? "#2e4a6b" : "#241c2e";
                ctx.fillRect(x, y, p.w, THICK);
                ctx.fillStyle = p.kind === "crumble" ? "#b88a6a" : p.kind === "moving" ? "#6fb4ff" : "#d9a0ff";
                ctx.fillRect(x, y, p.w, 5);
                ctx.fillStyle = "rgba(255,230,160,0.35)";
                for (let wx = 10; wx < p.w - 10; wx += 26) ctx.fillRect(x + wx, y + 12, 8, 8);

                if (p.spikes) {
                    ctx.fillStyle = "#e8e8f0";
                    const sx = p.x + p.w * 0.3;
                    const sw = p.w * 0.4;
                    const n = Math.floor(sw / 14);
                    for (let i = 0; i < n; i++) {
                        ctx.beginPath();
                        ctx.moveTo(sx + i * 14, p.y);
                        ctx.lineTo(sx + i * 14 + 7, p.y - 14);
                        ctx.lineTo(sx + i * 14 + 14, p.y);
                        ctx.fill();
                    }
                }
                if (p.checkpoint) {
                    const reached = spawn.x === p.x + p.w / 2 - PW / 2;
                    ctx.fillStyle = "#cfcfd8";
                    ctx.fillRect(x + p.w / 2 - 1.5, y - 52, 3, 52);
                    ctx.fillStyle = reached ? "#5fe08a" : "#ff6a6a";
                    ctx.beginPath();
                    ctx.moveTo(x + p.w / 2 + 1.5, y - 52);
                    ctx.lineTo(x + p.w / 2 + 28, y - 44 + Math.sin(t * 6) * 2);
                    ctx.lineTo(x + p.w / 2 + 1.5, y - 34);
                    ctx.fill();
                }
            }

            for (let i = dust.length - 1; i >= 0; i--) {
                const d = dust[i];
                d.life += dt;
                if (d.life > 0.5) { dust.splice(i, 1); continue; }
                d.x += d.vx * dt;
                d.y += d.vy * dt;
                ctx.globalAlpha = 0.5 * (1 - d.life / 0.5);
                ctx.fillStyle = "#fff";
                ctx.beginPath();
                ctx.arc(d.x, d.y, 3, 0, Math.PI * 2);
                ctx.fill();
            }
            ctx.globalAlpha = 1;

            // the runner
            ctx.save();
            ctx.translate(px + PW / 2, py + PH);
            ctx.scale(facing, 1);
            const stride = grounded ? Math.sin(anim * 3) * Math.min(1, Math.abs(vx) / RUN) : 0.6;
            const air = grounded ? 0 : 0.8;
            ctx.strokeStyle = "#16161c";
            ctx.lineWidth = 5;
            ctx.lineCap = "round";
            ctx.beginPath();
            ctx.moveTo(-2, -16);
            ctx.lineTo(-2 - stride * 9 - air * 4, 0);
            ctx.moveTo(2, -16);
            ctx.lineTo(2 + stride * 9 + air * 4, 0);
            ctx.stroke();
            ctx.fillStyle = "#ff9a3d";
            ctx.fillRect(-8, -34, 16, 20);
            ctx.fillStyle = "#f1c9a0";
            ctx.beginPath();
            ctx.arc(1, -41, 7, 0, Math.PI * 2);
            ctx.fill();
            ctx.fillStyle = "#16161c";
            ctx.fillRect(2, -44, 6, 3);
            ctx.restore();

            ctx.restore();

            // overlay
            ctx.fillStyle = "#fff";
            ctx.font = "bold 22px sans-serif";
            ctx.textAlign = "left";
            ctx.fillText(`${meters} m`, 16, 32);
            ctx.font = "13px sans-serif";
            ctx.fillStyle = "rgba(255,255,255,0.8)";
            ctx.fillText(`best ${bestRun} m   falls ${live.current.deaths}`, 16, 52);

            if (flash > 0) {
                flash = Math.max(0, flash - dt * 2.5);
                ctx.fillStyle = `rgba(255,255,255,${flash * 0.6})`;
                ctx.fillRect(0, 0, w, h);
            }
        };

        return draw;
    }, []);

    return (
        <div>
            <div className="vc-lounge-stats">
                <span className="vc-lounge-coins">Rooftop run</span>
                <span className="vc-lounge-muted">best {stats.best} m, {stats.deaths} falls</span>
            </div>
            <div className="vc-lounge-playfield">
                <canvas ref={ref} className="vc-lounge-arena" aria-label="Rooftop parkour" />
            </div>
            <p className="vc-lounge-muted">
                A and D or the arrows to run, Space or W to jump (tap for a short hop). Flags save your spot. Brown roofs crumble, blue ones move, mind the spikes.
            </p>
        </div>
    );
}
