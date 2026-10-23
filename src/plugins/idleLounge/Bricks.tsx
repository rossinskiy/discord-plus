/*
 * Vencord, a Discord client mod
 * Copyright (c) 2026 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import {
    autoCost, ballCost, brickLevelUp, buyBrickUpgrade, critCost, earnShards, formatNumber, magnetCost, MAX_AUTO, MAX_BALLS, MAX_CRIT,
    MAX_MAGNET, MAX_SPEED, MAX_SPLASH, powerCost, speedCost, splashCost, state
} from "./game";
import { Draw, useCanvas } from "./useCanvas";
import { useGame } from "./useGame";

const COLS = 12;
const ROWS = 9;
const GAP = 3;
const BRICK_H = 20;

interface Brick { x: number; y: number; w: number; hp: number; max: number; hue: number; }
interface Ball { x: number; y: number; vx: number; vy: number; r: number; fire: boolean; trail: number[]; }
interface Bit { x: number; y: number; vx: number; vy: number; life: number; hue: number; }

const rand = (a: number, b: number) => a + Math.random() * (b - a);

function baseHp(level: number) {
    return Math.floor(2 + level ** 1.4 * 1.6);
}

function ballSpeed() {
    return 210 + state.speed * 55;
}

function Arena() {
    const ref = useCanvas((w, h) => {
        const bw = (w - 24 - GAP * (COLS - 1)) / COLS;
        let bricks: Brick[] = [];
        const balls: Ball[] = [];
        const bits: Bit[] = [];
        let banner = 0;
        let bannerText = "";
        let fireCooldown = 0;
        let autoTimer = 3;
        let pendingClear = 0;

        const generate = () => {
            bricks = [];
            const base = baseHp(state.brickLevel);
            for (let r = 0; r < ROWS; r++) {
                for (let c = 0; c < COLS; c++) {
                    if (Math.random() < 0.28) continue;
                    const hp = Math.max(1, Math.ceil(base * (0.6 + Math.random() * 0.9) * (1 + (ROWS - r) * 0.04)));
                    bricks.push({ x: 12 + c * (bw + GAP), y: 14 + r * (BRICK_H + GAP), w: bw, hp, max: hp, hue: (state.brickLevel * 37 + r * 14) % 360 });
                }
            }
            if (!bricks.length) generate();
        };
        generate();

        const launch = (x: number, y: number, vx: number, vy: number, fire = false) => {
            const speed = fire ? ballSpeed() * 1.25 : ballSpeed();
            const len = Math.hypot(vx, vy) || 1;
            balls.push({ x, y, vx: (vx / len) * speed, vy: (vy / len) * speed, r: fire ? 10 : 5, fire, trail: [] });
        };

        const hit = (b: Brick, dmgIn: number, splashing = false) => {
            let dmg = dmgIn;
            if (!splashing && Math.random() < state.crit * 0.025) {
                dmg *= 4;
                bits.push({ x: b.x + b.w / 2, y: b.y, vx: 0, vy: -60, life: 0, hue: 50 });
            }
            b.hp -= dmg;
            if (!splashing && state.splash > 0) {
                for (const n of bricks.slice()) {
                    if (n === b) continue;
                    const d = Math.hypot(n.x - b.x, n.y - b.y);
                    if (d < (bw + GAP) * 1.45) hit(n, dmg * state.splash * 0.15, true);
                }
            }
            if (b.hp > 0 || !bricks.includes(b)) return;
            const reward = b.max * (1 + state.brickLevel * 0.05);
            earnShards(reward);
            for (let i = 0; i < 8; i++) {
                bits.push({ x: b.x + b.w / 2, y: b.y + BRICK_H / 2, vx: rand(-120, 120), vy: rand(-160, 40), life: 0, hue: b.hue });
            }
            bricks.splice(bricks.indexOf(b), 1);
        };

        const draw: Draw = (ctx, w, h, t, dt, p) => {
            // keep the number of balls in step with upgrades
            const normal = balls.filter(b => !b.fire).length;
            for (let i = normal; i < state.balls; i++) {
                launch(rand(w * 0.3, w * 0.7), h - 14, rand(-1, 1), -1);
            }

            fireCooldown -= dt;
            if (state.auto > 0) {
                autoTimer -= dt;
                if (autoTimer <= 0) {
                    autoTimer = 11 - state.auto;
                    launch(rand(w * 0.2, w * 0.8), h - 12, rand(-0.5, 0.5), -1, true);
                }
            }
            for (const c of p.clicks) {
                if (fireCooldown > 0) continue;
                fireCooldown = 1.2;
                launch(c.x, h - 12, 0, -1, true);
            }

            const speed = ballSpeed();
            const steps = Math.max(1, Math.ceil((speed * 1.25 * dt) / 4));
            const sdt = dt / steps;

            for (let s = 0; s < steps; s++) {
                for (let i = balls.length - 1; i >= 0; i--) {
                    const b = balls[i];
                    b.x += b.vx * sdt;
                    b.y += b.vy * sdt;

                    if (b.x < b.r) { b.x = b.r; b.vx = Math.abs(b.vx); }
                    if (b.x > w - b.r) { b.x = w - b.r; b.vx = -Math.abs(b.vx); }
                    if (b.y < b.r) { b.y = b.r; b.vy = Math.abs(b.vy); }
                    if (b.y > h - b.r) {
                        if (b.fire) { balls.splice(i, 1); continue; }
                        b.y = h - b.r;
                        b.vy = -Math.abs(b.vy);
                        // keep the bounce from going flat
                        if (Math.abs(b.vy) < speed * 0.3) {
                            b.vy = -speed * 0.3;
                            b.vx = Math.sign(b.vx || 1) * Math.sqrt(speed * speed - b.vy * b.vy);
                        }
                    }

                    for (const br of bricks) {
                        const nx = Math.max(br.x, Math.min(b.x, br.x + br.w));
                        const ny = Math.max(br.y, Math.min(b.y, br.y + BRICK_H));
                        const dx = b.x - nx;
                        const dy = b.y - ny;
                        if (dx * dx + dy * dy > b.r * b.r) continue;

                        hit(br, b.fire ? state.power * 8 : state.power);
                        if (!b.fire) {
                            if (Math.abs(dx) > Math.abs(dy)) { b.vx = Math.sign(dx || b.vx) * Math.abs(b.vx); b.x = nx + Math.sign(dx || 1) * b.r; }
                            else { b.vy = Math.sign(dy || b.vy) * Math.abs(b.vy); b.y = ny + Math.sign(dy || 1) * b.r; }
                        }
                        break;
                    }
                }
            }

            if (!bricks.length && pendingClear === 0) {
                pendingClear = 1.4;
                brickLevelUp();
                bannerText = `Level ${state.brickLevel}`;
                banner = 1.6;
            }
            if (pendingClear > 0) {
                pendingClear -= dt;
                if (pendingClear <= 0) { pendingClear = 0; generate(); }
            }

            // draw
            ctx.fillStyle = "rgba(11,13,28,0.38)";
            ctx.fillRect(0, 0, w, h);

            for (const br of bricks) {
                const k = br.hp / br.max;
                ctx.fillStyle = `hsl(${br.hue} 70% ${28 + k * 28}%)`;
                ctx.fillRect(br.x, br.y, br.w, BRICK_H);
                ctx.fillStyle = "rgba(255,255,255,0.18)";
                ctx.fillRect(br.x, br.y, br.w, 3);
                if (br.w > 28) {
                    ctx.fillStyle = "#fff";
                    ctx.font = "bold 11px sans-serif";
                    ctx.textAlign = "center";
                    ctx.fillText(formatNumber(br.hp), br.x + br.w / 2, br.y + 14);
                }
            }

            for (const b of balls) {
                b.trail.push(b.x, b.y);
                if (b.trail.length > (b.fire ? 24 : 10)) b.trail.splice(0, 2);
                ctx.strokeStyle = b.fire ? "rgba(255,150,60,0.6)" : "rgba(200,225,255,0.4)";
                ctx.lineWidth = b.r * 0.9;
                ctx.lineCap = "round";
                ctx.beginPath();
                ctx.moveTo(b.trail[0], b.trail[1]);
                for (let i = 2; i < b.trail.length; i += 2) ctx.lineTo(b.trail[i], b.trail[i + 1]);
                ctx.stroke();
                ctx.save();
                ctx.shadowColor = b.fire ? "#ff7a2a" : "#bfe0ff";
                ctx.shadowBlur = b.fire ? 18 : 8;
                ctx.fillStyle = b.fire ? "#ffd27a" : "#fff";
                ctx.beginPath();
                ctx.arc(b.x, b.y, b.r, 0, Math.PI * 2);
                ctx.fill();
                ctx.restore();
            }

            for (let i = bits.length - 1; i >= 0; i--) {
                const bit = bits[i];
                bit.life += dt;
                if (bit.life > 0.7) { bits.splice(i, 1); continue; }
                bit.vy += 500 * dt;
                bit.x += bit.vx * dt;
                bit.y += bit.vy * dt;
                ctx.globalAlpha = 1 - bit.life / 0.7;
                ctx.fillStyle = `hsl(${bit.hue} 80% 65%)`;
                ctx.fillRect(bit.x, bit.y, 4, 4);
            }
            ctx.globalAlpha = 1;

            if (banner > 0) {
                banner -= dt;
                ctx.globalAlpha = Math.min(1, banner);
                ctx.fillStyle = "#fff";
                ctx.font = "bold 40px sans-serif";
                ctx.textAlign = "center";
                ctx.strokeStyle = "rgba(0,0,0,0.6)";
                ctx.lineWidth = 5;
                ctx.strokeText(bannerText, w / 2, h / 2);
                ctx.fillText(bannerText, w / 2, h / 2);
                ctx.globalAlpha = 1;
            }
        };

        return draw;
    });

    return <canvas ref={ref} className="vc-lounge-arena" aria-label="Bricks. Click to fire a fireball." />;
}

export function Bricks() {
    useGame();

    const upgrades = [
        { id: "ball" as const, name: "More balls", info: `${state.balls}/${MAX_BALLS} balls`, cost: ballCost(), maxed: state.balls >= MAX_BALLS },
        { id: "power" as const, name: "Ball power", info: `${state.power} damage per hit`, cost: powerCost(), maxed: false },
        { id: "speed" as const, name: "Ball speed", info: `${state.speed}/${MAX_SPEED}`, cost: speedCost(), maxed: state.speed >= MAX_SPEED },
        { id: "crit" as const, name: "Critical hits", info: `${(state.crit * 2.5).toFixed(1)}% chance for 4x damage (${state.crit}/${MAX_CRIT})`, cost: critCost(), maxed: state.crit >= MAX_CRIT },
        { id: "splash" as const, name: "Splash damage", info: `Neighbouring bricks take ${state.splash * 15}% (${state.splash}/${MAX_SPLASH})`, cost: splashCost(), maxed: state.splash >= MAX_SPLASH },
        { id: "magnet" as const, name: "Shard magnet", info: `+${state.magnet * 30}% shards (${state.magnet}/${MAX_MAGNET})`, cost: magnetCost(), maxed: state.magnet >= MAX_MAGNET },
        { id: "auto" as const, name: "Auto fireball", info: state.auto ? `A free fireball every ${11 - state.auto}s (${state.auto}/${MAX_AUTO})` : `Fires fireballs for you (0/${MAX_AUTO})`, cost: autoCost(), maxed: state.auto >= MAX_AUTO }
    ];

    return (
        <div>
            <div className="vc-lounge-stats">
                <span className="vc-lounge-coins">{formatNumber(state.shards)} shards</span>
                <span className="vc-lounge-muted">Level {state.brickLevel}</span>
                <span className="vc-lounge-muted">+{(state.brickLevel - 1)}% to the farm</span>
            </div>

            <div className="vc-lounge-fishing">
                <div>
                    <div className="vc-lounge-field"><Arena /></div>
                    <p className="vc-lounge-muted">
                        The balls play by themselves while this tab is open. Click to fire a fireball (hits 8x as hard).
                        Every level you clear adds 1% to your garden.
                    </p>
                </div>

                <div className="vc-lounge-list">
                    {upgrades.map(u => (
                        <div className="vc-lounge-row" key={u.id}>
                            <div>
                                <div className="vc-lounge-row-title">{u.name}</div>
                                <div className="vc-lounge-muted">{u.info}</div>
                            </div>
                            <button
                                className="vc-lounge-btn"
                                disabled={u.maxed || state.shards < u.cost}
                                onClick={() => buyBrickUpgrade(u.id)}
                            >
                                {u.maxed ? "Maxed" : `Buy ${formatNumber(u.cost)}`}
                            </button>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}
