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

interface Stats { laps: number; best: number; km: number; }

const JOG = 150;
const SPRINT = 330;
const TIRED = 80;

const fmtTime = (s: number) => `${Math.floor(s / 60)}:${(s % 60).toFixed(2).padStart(5, "0")}`;

export function Circle() {
    const [stats, setStats] = useState<Stats>(() => readStat<Stats>("circle", { laps: 0, best: 0, km: 0 }));
    const live = useRef(stats);
    live.current = stats;

    const ref = useCanvas((w, h) => {
        const cx = w / 2;
        const cy = h / 2;
        const radius = Math.min(w, h) * 0.34;
        const lane = Math.min(72, radius * 0.45);
        let angle = -Math.PI / 2;
        let stamina = 100;
        let exhausted = false;
        let lapTime = 0;
        let step = 0;
        let lapFlash = 0;
        let dist = 0;
        let ghostStart = 0;

        const drawRunner = (ctx: CanvasRenderingContext2D, a: number, r: number, color: string, phase: number, alpha = 1) => {
            const x = cx + Math.cos(a) * r;
            const y = cy + Math.sin(a) * r;
            ctx.save();
            ctx.globalAlpha = alpha;
            ctx.translate(x, y);
            ctx.rotate(a + Math.PI / 2);
            // legs
            ctx.fillStyle = "#2a2a32";
            ctx.beginPath();
            ctx.ellipse(-5, Math.sin(phase) * 7, 3.5, 5.5, 0, 0, Math.PI * 2);
            ctx.ellipse(5, -Math.sin(phase) * 7, 3.5, 5.5, 0, 0, Math.PI * 2);
            ctx.fill();
            // shoulders and head
            ctx.fillStyle = color;
            ctx.beginPath();
            ctx.ellipse(0, 0, 10, 6, 0, 0, Math.PI * 2);
            ctx.fill();
            ctx.fillStyle = "#f1c9a0";
            ctx.beginPath();
            ctx.arc(0, -1, 5, 0, Math.PI * 2);
            ctx.fill();
            ctx.restore();
        };

        const draw: Draw = (ctx, w, h, t, dt, p) => {
            const sprint = (p.down || held("space", "shift")) && !exhausted && stamina > 0;
            if (sprint) {
                stamina = Math.max(0, stamina - 26 * dt);
                if (stamina === 0) exhausted = true;
            } else {
                stamina = Math.min(100, stamina + (exhausted ? 8 : 12) * dt);
                if (exhausted && stamina > 35) exhausted = false;
            }
            const speed = sprint ? SPRINT : exhausted ? TIRED : JOG;
            const da = (speed / radius) * dt;
            angle += da;
            dist += speed * dt;
            step += (speed / 22) * dt * 2;
            lapTime += dt;

            // a lap is a full turn from the start line at the top
            const turns = (angle + Math.PI / 2) / (Math.PI * 2);
            if (turns >= 1) {
                angle -= Math.PI * 2;
                const cur = live.current;
                const best = cur.best === 0 ? lapTime : Math.min(cur.best, lapTime);
                const next = { laps: cur.laps + 1, best, km: cur.km + (Math.PI * 2 * radius) / 1000 / 20 };
                writeStat("circle", next);
                setStats(next);
                tone(best === lapTime ? 880 : 620, 0.1, 0.18, "triangle", 1.3);
                lapFlash = 1;
                lapTime = 0;
                ghostStart = t;
            }
            lapFlash = Math.max(0, lapFlash - dt);

            const dizzy = Math.min(1, live.current.laps / 25);
            ctx.save();
            ctx.translate(cx, cy);
            ctx.rotate(Math.sin(t * 0.7) * 0.025 * dizzy);
            ctx.translate(-cx, -cy);

            // grass with mowing stripes
            ctx.fillStyle = "#2f6b3a";
            ctx.fillRect(-20, -20, w + 40, h + 40);
            ctx.fillStyle = "rgba(255,255,255,0.04)";
            for (let x = -20; x < w + 20; x += 60) ctx.fillRect(x, -20, 30, h + 40);

            // track
            ctx.strokeStyle = "#b5532f";
            ctx.lineWidth = lane;
            ctx.beginPath();
            ctx.arc(cx, cy, radius, 0, Math.PI * 2);
            ctx.stroke();
            ctx.strokeStyle = "rgba(255,255,255,0.7)";
            ctx.lineWidth = 2;
            for (const r of [radius - lane / 2, radius, radius + lane / 2]) {
                ctx.beginPath();
                ctx.arc(cx, cy, r, 0, Math.PI * 2);
                ctx.stroke();
            }
            // start line
            ctx.fillStyle = "#fff";
            ctx.fillRect(cx - 2, cy - radius - lane / 2, 4, lane);

            // infield
            ctx.fillStyle = "#3d8a4a";
            ctx.beginPath();
            ctx.arc(cx, cy, radius - lane / 2 - 3, 0, Math.PI * 2);
            ctx.fill();

            // crowd
            for (let i = 0; i < 90; i++) {
                const a = (i / 90) * Math.PI * 2;
                const r = radius + lane / 2 + 22 + (i % 3) * 9;
                const wave = Math.sin(t * 5 + i) * (lapFlash > 0 ? 4 : 1.4);
                ctx.fillStyle = `hsl(${(i * 47) % 360} 55% 55%)`;
                ctx.beginPath();
                ctx.arc(cx + Math.cos(a) * r, cy + Math.sin(a) * r + wave, 4, 0, Math.PI * 2);
                ctx.fill();
            }

            // the ghost of your best lap
            const { best } = live.current;
            if (best > 0) {
                const g = -Math.PI / 2 + (((t - ghostStart) % best) / best) * Math.PI * 2;
                drawRunner(ctx, g, radius - lane * 0.22, "#ffffff", step + 1, 0.4);
            }
            drawRunner(ctx, angle, radius + lane * 0.12, sprint ? "#ff5f5f" : "#4a90e2", step);
            ctx.restore();

            // scoreboard
            ctx.fillStyle = "#fff";
            ctx.textAlign = "center";
            ctx.font = "bold 30px sans-serif";
            ctx.fillText(fmtTime(lapTime), cx, cy - 6);
            ctx.font = "13px sans-serif";
            ctx.fillStyle = "rgba(255,255,255,0.8)";
            ctx.fillText(best ? `best ${fmtTime(best)}` : "no lap yet", cx, cy + 16);
            ctx.fillText(`${(dist / 1000 / 20).toFixed(2)} km this session`, cx, cy + 34);

            if (lapFlash > 0) {
                ctx.globalAlpha = lapFlash;
                ctx.font = "bold 20px sans-serif";
                ctx.fillStyle = "#ffe27a";
                ctx.fillText("LAP", cx, cy - 46);
                ctx.globalAlpha = 1;
            }

            // stamina
            const bw = Math.min(240, w - 60);
            ctx.fillStyle = "rgba(0,0,0,0.35)";
            ctx.fillRect(cx - bw / 2, h - 28, bw, 10);
            ctx.fillStyle = exhausted ? "#e04848" : "#5fbf6a";
            ctx.fillRect(cx - bw / 2, h - 28, bw * (stamina / 100), 10);
        };

        return draw;
    }, []);

    return (
        <div>
            <div className="vc-lounge-stats">
                <span className="vc-lounge-coins">{stats.laps} laps</span>
                <span className="vc-lounge-muted">{stats.km.toFixed(1)} km all time</span>
            </div>
            <div className="vc-lounge-playfield">
                <canvas ref={ref} className="vc-lounge-arena" aria-label="Running track" />
            </div>
            <p className="vc-lounge-muted">
                Hold the mouse or Space to sprint. Stamina runs out, so jog to get it back. The ghost is your best lap.
            </p>
        </div>
    );
}
