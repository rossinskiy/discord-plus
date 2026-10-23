/*
 * Vencord, a Discord client mod
 * Copyright (c) 2026 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { useState } from "@webpack/common";

import { Circle } from "./Circle";
import { useKeys } from "./input";
import { Knife } from "./Knife";
import { Parkour } from "./Parkour";

const GAMES = [
    { id: "knife", label: "Knife flip" },
    { id: "circle", label: "Run in circles" },
    { id: "parkour", label: "Parkour" }
] as const;

type GameId = typeof GAMES[number]["id"];

export function Play() {
    useKeys();
    const [game, setGame] = useState<GameId>("knife");

    return (
        <div>
            <div className="vc-lounge-row-actions" role="group" aria-label="Pick a game">
                {GAMES.map(g => (
                    <button
                        key={g.id}
                        className="vc-lounge-btn"
                        data-variant={g.id === game ? undefined : "secondary"}
                        onClick={e => { setGame(g.id); e.currentTarget.blur(); }}
                    >
                        {g.label}
                    </button>
                ))}
            </div>
            <div style={{ marginTop: 10 }}>
                {game === "knife" && <Knife />}
                {game === "circle" && <Circle />}
                {game === "parkour" && <Parkour />}
            </div>
        </div>
    );
}
