/*
 * Vencord, a Discord client mod
 * Copyright (c) 2026 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { useEffect, useRef, useState } from "@webpack/common";

import {
    AUTO_FISHER_COST, biteWindowMs, buyAutoFisher, buyLine, buyRod, catchFish, formatNumber, lineCost, RARITY_COLOR, RARITY_ORDER, RODS,
rollFish, setAutoFisher, SPECIES, Species, speciesDiscovered, state, waitSeconds
} from "./game";
import { pond, PondCanvas } from "./PondScene";
import { MAX_LINES } from "./progress";
import { useGame } from "./useGame";

type Phase = "idle" | "waiting" | "bite";

export function Fishing() {
    useGame();
    const [phase, setPhase] = useState<Phase>("idle");
    const [log, setLog] = useState("Cast your line.");
    const phaseRef = useRef<Phase>("idle");
    const fishRef = useRef<Species | null>(null);
    const timers = useRef<ReturnType<typeof setTimeout>[]>([]);

    const later = (fn: () => void, ms: number) => {
        timers.current.push(setTimeout(fn, ms));
    };

    const go = (p: Phase) => {
        phaseRef.current = p;
        pond.phase = p;
        setPhase(p);
    };

    function cast() {
        if (phaseRef.current !== "idle") return;
        go("waiting");
        setLog("Waiting for a bite...");
        later(() => {
            fishRef.current = rollFish();
            go("bite");
            setLog("Something is biting! Reel in!");
            later(() => {
                if (phaseRef.current !== "bite") return;
                go("idle");
                pond.missAt = performance.now();
                setLog("It got away. Cast again.");
            }, biteWindowMs());

            if (state.autoFisher && state.autoFisherOn) {
                later(reel, 350 + Math.random() * 650);
            }
        }, waitSeconds() * 1000 * (0.6 + Math.random() * 0.8));
    }

    function reel() {
        if (phaseRef.current !== "bite" || !fishRef.current) return;
        // every extra line brings in one more fish
        const catches = [fishRef.current, ...Array.from({ length: state.lines - 1 }, rollFish)];
        let total = 0;
        let firsts = 0;
        let sizeNote = "";
        let best = catches[0];
        for (const sp of catches) {
            const r = catchFish(sp);
            total += r.reward;
            if (r.first) firsts++;
            if (r.size === "jumbo") sizeNote = " (jumbo!)";
            else if (r.size === "big" && !sizeNote) sizeNote = " (big one)";
            if (RARITY_ORDER.indexOf(sp.rarity) > RARITY_ORDER.indexOf(best.rarity)) best = sp;
        }
        go("idle");
        pond.catch = { species: best, at: performance.now() };
        const extra = catches.length - 1;
        setLog(`${firsts ? "New species! " : ""}Caught ${best.name}${extra ? ` and ${extra} more` : ""}${sizeNote} for ${formatNumber(total)} coins.`);
    }

    function onPond() {
        if (phase === "idle") cast();
        else if (phase === "bite") reel();
    }

    // Auto-fisher keeps casting for as long as the lounge is open.
    useEffect(() => {
        if (phase === "idle" && state.autoFisher && state.autoFisherOn) {
            const t = setTimeout(cast, 900);
            return () => clearTimeout(t);
        }
    }, [phase, state.autoFisher, state.autoFisherOn]);

    useEffect(() => () => timers.current.forEach(clearTimeout), []);

    const nextRod = RODS[state.rod + 1];

    return (
        <div className="vc-lounge-fishing">
            <div>
                <div className="vc-lounge-pond">
                    <PondCanvas />
                    <div className="vc-lounge-pond-ui">
                        <div className="vc-lounge-log" role="status">{log}</div>
                        <button className="vc-lounge-btn" onClick={onPond} disabled={phase === "waiting"}>
                            {phase === "idle" ? "Cast" : phase === "bite" ? "Reel in!" : "Waiting..."}
                        </button>
                    </div>
                </div>

                <div className="vc-lounge-section">Gear</div>
                <div className="vc-lounge-list">
                    <div className="vc-lounge-row">
                        <div>
                            <div className="vc-lounge-row-title">{RODS[state.rod].name}</div>
                            <div className="vc-lounge-muted">
                                Bite every ~{waitSeconds().toFixed(1)}s, {(biteWindowMs() / 1000).toFixed(1)}s to reel in.
                                Better rods bring up rarer fish.
                            </div>
                        </div>
                        {nextRod && (
                            <button className="vc-lounge-btn" disabled={state.coins < nextRod.cost} onClick={buyRod}>
                                {nextRod.name} {formatNumber(nextRod.cost)}
                            </button>
                        )}
                    </div>
                    <div className="vc-lounge-row">
                        <div>
                            <div className="vc-lounge-row-title">Fishing lines ({state.lines}/{MAX_LINES})</div>
                            <div className="vc-lounge-muted">Each line brings in one more fish per cast.</div>
                        </div>
                        {state.lines < MAX_LINES ? (
                            <button className="vc-lounge-btn" disabled={state.coins < lineCost()} onClick={buyLine}>
                                Buy {formatNumber(lineCost())}
                            </button>
                        ) : <span className="vc-lounge-muted">Maxed</span>}
                    </div>
                    <div className="vc-lounge-row">
                        <div>
                            <div className="vc-lounge-row-title">Auto-fisher</div>
                            <div className="vc-lounge-muted">
                                Casts and reels for you while the lounge is open.
                            </div>
                        </div>
                        {state.autoFisher ? (
                            <button className="vc-lounge-btn" data-variant="secondary" onClick={() => setAutoFisher(!state.autoFisherOn)}>
                                {state.autoFisherOn ? "On" : "Off"}
                            </button>
                        ) : (
                            <button className="vc-lounge-btn" disabled={state.coins < AUTO_FISHER_COST} onClick={buyAutoFisher}>
                                Buy {formatNumber(AUTO_FISHER_COST)}
                            </button>
                        )}
                    </div>
                </div>
            </div>

            <div>
                <div className="vc-lounge-stats">
                    <span className="vc-lounge-coins">{formatNumber(state.coins)} coins</span>
                    <span className="vc-lounge-muted">
                        {speciesDiscovered()}/{SPECIES.length} species, +{speciesDiscovered() * 2}% to the farm
                    </span>
                </div>
                <div className="vc-lounge-dex">
                    {SPECIES.map(s => {
                        const n = state.caught[s.id] ?? 0;
                        return (
                            <div
                                key={s.id}
                                className="vc-lounge-fish"
                                data-locked={n === 0}
                                style={{ "--rarity": RARITY_COLOR[s.rarity] } as React.CSSProperties}
                            >
                                <div className="vc-lounge-row-title">{n ? s.name : "???"}</div>
                                <div className="vc-lounge-muted">{n ? `${s.rarity}, caught ${n}` : s.rarity}</div>
                            </div>
                        );
                    })}
                </div>
            </div>
        </div>
    );
}
