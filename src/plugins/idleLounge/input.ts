/*
 * Vencord, a Discord client mod
 * Copyright (c) 2026 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { useEffect } from "@webpack/common";

// Keys currently held, lowercased, with the space bar named "space".
export const keys = new Set<string>();

const HANDLED = new Set(["arrowleft", "arrowright", "arrowup", "arrowdown", "space", "a", "d", "w", "s", "shift"]);

const name = (e: KeyboardEvent) => (e.key === " " ? "space" : e.key.toLowerCase());

// While a game is mounted, grab the movement keys so they don't scroll the page
// or "click" whichever button still has focus.
export function useKeys() {
    useEffect(() => {
        const down = (e: KeyboardEvent) => {
            const k = name(e);
            if (!HANDLED.has(k) || e.ctrlKey || e.metaKey || e.altKey) return;
            e.preventDefault();
            e.stopPropagation();
            keys.add(k);
        };
        const up = (e: KeyboardEvent) => {
            const k = name(e);
            if (!HANDLED.has(k)) return;
            e.preventDefault();
            keys.delete(k);
        };
        const clear = () => keys.clear();

        window.addEventListener("keydown", down, true);
        window.addEventListener("keyup", up, true);
        window.addEventListener("blur", clear);
        return () => {
            window.removeEventListener("keydown", down, true);
            window.removeEventListener("keyup", up, true);
            window.removeEventListener("blur", clear);
            keys.clear();
        };
    }, []);
}

export const held = (...names: string[]) => names.some(n => keys.has(n));
