/*
 * Vencord, a Discord client mod
 * Copyright (c) 2026 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { useEffect, useRef } from "@webpack/common";

export interface Pointer {
    x: number;
    y: number;
    px: number;
    py: number;
    down: boolean;
    inside: boolean;
    /** Clicks since the last frame, in canvas coordinates. */
    clicks: { x: number; y: number; }[];
}

export type Draw = (ctx: CanvasRenderingContext2D, w: number, h: number, t: number, dt: number, p: Pointer) => void;

// Runs a requestAnimationFrame loop for a canvas. `setup` is called whenever the
// size changes (and on mount) and returns the per-frame draw function, so a scene
// can keep its own state in a closure. The pointer is tracked for interactive scenes.
export function useCanvas(setup: (w: number, h: number) => Draw, deps: unknown[] = []) {
    const ref = useRef<HTMLCanvasElement>(null);

    useEffect(() => {
        const canvas = ref.current!;
        const ctx = canvas.getContext("2d")!;
        const pointer: Pointer = { x: 0, y: 0, px: 0, py: 0, down: false, inside: false, clicks: [] };
        let draw: Draw | undefined;
        let w = 0;
        let h = 0;

        const resize = () => {
            const dpr = Math.min(window.devicePixelRatio || 1, 2);
            const nw = canvas.clientWidth;
            const nh = canvas.clientHeight;
            if (!nw || !nh || (nw === w && nh === h && draw)) return;
            w = nw;
            h = nh;
            canvas.width = w * dpr;
            canvas.height = h * dpr;
            ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
            draw = setup(w, h);
        };

        const locate = (e: PointerEvent) => {
            const rect = canvas.getBoundingClientRect();
            return { x: e.clientX - rect.left, y: e.clientY - rect.top };
        };
        const onMove = (e: PointerEvent) => {
            const { x, y } = locate(e);
            if (!pointer.inside) { pointer.px = x; pointer.py = y; }
            pointer.x = x;
            pointer.y = y;
            pointer.inside = true;
        };
        const onDown = (e: PointerEvent) => {
            onMove(e);
            pointer.down = true;
            pointer.clicks.push({ x: pointer.x, y: pointer.y });
            canvas.setPointerCapture(e.pointerId);
        };
        const onUp = () => { pointer.down = false; };
        const onLeave = () => { pointer.inside = false; };

        canvas.addEventListener("pointermove", onMove);
        canvas.addEventListener("pointerdown", onDown);
        canvas.addEventListener("pointerup", onUp);
        canvas.addEventListener("pointercancel", onUp);
        canvas.addEventListener("pointerleave", onLeave);

        resize();
        const observer = new ResizeObserver(resize);
        observer.observe(canvas);

        let raf = 0;
        let last = performance.now();
        const start = last;
        const frame = (now: number) => {
            raf = requestAnimationFrame(frame);
            if (document.hidden || !draw) { last = now; return; }
            const dt = Math.min((now - last) / 1000, 0.1);
            last = now;
            draw(ctx, w, h, (now - start) / 1000, dt, pointer);
            pointer.px = pointer.x;
            pointer.py = pointer.y;
            pointer.clicks.length = 0;
        };
        raf = requestAnimationFrame(frame);

        return () => {
            cancelAnimationFrame(raf);
            observer.disconnect();
            canvas.removeEventListener("pointermove", onMove);
            canvas.removeEventListener("pointerdown", onDown);
            canvas.removeEventListener("pointerup", onUp);
            canvas.removeEventListener("pointercancel", onUp);
            canvas.removeEventListener("pointerleave", onLeave);
        };
    }, deps);

    return ref;
}

export function mix(a: number[], b: number[], k: number) {
    return a.map((v, i) => v + (b[i] - v) * k);
}

export const rgb = (c: number[], alpha = 1) => `rgba(${c[0] | 0},${c[1] | 0},${c[2] | 0},${alpha})`;
