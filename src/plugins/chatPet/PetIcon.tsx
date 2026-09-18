/*
 * Discord+, a fork of Vencord
 * Copyright (c) 2023 Vendicated and contributors
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU General Public License for more details.
 *
 * You should have received a copy of the GNU General Public License
 * along with this program.  If not, see <https://www.gnu.org/licenses/>.
*/

import { React, useEffect, useRef } from "@webpack/common";

const PUPIL_RANGE = 2.4; // px the pupil can drift from center

export function PetIcon(props: { width?: number; height?: number; } & Record<string, any>) {
    const size = props.width ?? 22;

    const containerRef = useRef<HTMLDivElement>(null);
    const leftPupilRef = useRef<SVGCircleElement>(null);
    const rightPupilRef = useRef<SVGCircleElement>(null);
    const eyesRef = useRef<SVGGElement>(null);

    useEffect(() => {
        let frame: number;
        let mouseX = 0, mouseY = 0;

        const onMove = (e: MouseEvent) => {
            mouseX = e.clientX;
            mouseY = e.clientY;
        };
        window.addEventListener("mousemove", onMove);

        const tick = () => {
            frame = requestAnimationFrame(tick);

            const el = containerRef.current;
            if (!el) return;

            const rect = el.getBoundingClientRect();
            const cx = rect.left + rect.width / 2;
            const cy = rect.top + rect.height / 2;

            const dx = mouseX - cx;
            const dy = mouseY - cy;
            const dist = Math.hypot(dx, dy) || 1;

            const ox = (dx / dist) * PUPIL_RANGE;
            const oy = (dy / dist) * PUPIL_RANGE;

            const transform = `translate(${ox}px, ${oy}px)`;
            if (leftPupilRef.current) leftPupilRef.current.style.transform = transform;
            if (rightPupilRef.current) rightPupilRef.current.style.transform = transform;
        };
        frame = requestAnimationFrame(tick);

        // Occasional blink, purely decorative
        const blinkInterval = setInterval(() => {
            const eyes = eyesRef.current;
            if (!eyes) return;
            eyes.style.transform = "scaleY(0.1)";
            setTimeout(() => {
                if (eyes) eyes.style.transform = "scaleY(1)";
            }, 120);
        }, 2500 + Math.random() * 3000);

        return () => {
            window.removeEventListener("mousemove", onMove);
            cancelAnimationFrame(frame);
            clearInterval(blinkInterval);
        };
    }, []);

    return (
        <div
            ref={containerRef}
            style={{
                width: size,
                height: size,
                display: "flex",
                alignItems: "center",
                justifyContent: "center"
            }}
        >
            <svg width={size} height={size} viewBox="0 0 24 24">
                <circle cx="12" cy="12" r="10" fill="var(--interactive-normal)" />
                <g ref={eyesRef} style={{ transformOrigin: "12px 11px", transition: "transform 60ms ease" }}>
                    <circle cx="9" cy="11" r="2.4" fill="var(--background-primary)" />
                    <circle cx="15" cy="11" r="2.4" fill="var(--background-primary)" />
                    <circle ref={leftPupilRef} cx="9" cy="11" r="1.1" fill="var(--interactive-active)" />
                    <circle ref={rightPupilRef} cx="15" cy="11" r="1.1" fill="var(--interactive-active)" />
                </g>
            </svg>
        </div>
    );
}
