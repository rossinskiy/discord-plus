/*
 * Vencord, a Discord client mod
 * Copyright (c) 2026 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { useEffect, useState } from "@webpack/common";

import { subscribe } from "./game";

// Re-renders the calling component whenever the game state changes.
export function useGame() {
    const [, force] = useState(0);
    useEffect(() => subscribe(() => force(n => n + 1)), []);
}
