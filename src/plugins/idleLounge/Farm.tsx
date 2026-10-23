/*
 * Vencord, a Discord client mod
 * Copyright (c) 2026 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { useEffect, useState } from "@webpack/common";

import { FarmCanvas } from "./FarmScene";
import {
    activeBuff, bulkCost, butterflyDelayFactor, buyGenerator, buyTier, cps, formatNumber, generatorCost, generatorCps, GENERATORS, giveButterflyReward, harvest, maxAffordable,
nextTier, owned, permanentMultiplier,
seedsAvailable, seedsOnHarvest, state
} from "./game";
import { useGame } from "./useGame";

function ButterflyIcon() {
    return (
        <svg viewBox="0 0 44 44" aria-hidden="true">
            <ellipse cx="14" cy="16" rx="12" ry="9" fill="#f0b232" stroke="#a36b00" strokeWidth="1.5" />
            <ellipse cx="30" cy="16" rx="12" ry="9" fill="#f0b232" stroke="#a36b00" strokeWidth="1.5" />
            <ellipse cx="15" cy="29" rx="8" ry="7" fill="#ffd966" stroke="#a36b00" strokeWidth="1.5" />
            <ellipse cx="29" cy="29" rx="8" ry="7" fill="#ffd966" stroke="#a36b00" strokeWidth="1.5" />
            <rect x="20.5" y="10" width="3" height="26" rx="1.5" fill="#3a2a10" />
        </svg>
    );
}

function Field() {
    const [butterfly, setButterfly] = useState<{ x: number; y: number; } | null>(null);
    const [toast, setToast] = useState("");

    useEffect(() => {
        let spawn: ReturnType<typeof setTimeout>;
        let hide: ReturnType<typeof setTimeout>;

        const schedule = (min: number, max: number) => {
            const factor = butterflyDelayFactor();
            spawn = setTimeout(() => {
                setButterfly({ x: 10 + Math.random() * 75, y: 8 + Math.random() * 45 });
                hide = setTimeout(() => {
                    setButterfly(null);
                    schedule(60_000, 150_000);
                }, 12_000);
            }, (min + Math.random() * (max - min)) * factor);
        };

        schedule(30_000, 60_000);
        return () => {
            clearTimeout(spawn);
            clearTimeout(hide);
        };
    }, []);

    function onButterfly() {
        setButterfly(null);
        setToast(giveButterflyReward());
        setTimeout(() => setToast(""), 3500);
    }

    return (
        <div className="vc-lounge-field">
            {toast && <div className="vc-lounge-toast">{toast}</div>}
            <FarmCanvas />
            {butterfly && (
                <button
                    className="vc-lounge-butterfly"
                    style={{ left: `${butterfly.x}%`, top: `${butterfly.y}%` }}
                    onClick={onButterfly}
                    aria-label="Catch the golden butterfly"
                >
                    <ButterflyIcon />
                </button>
            )}
        </div>
    );
}

export function Farm() {
    useGame();
    const buff = activeBuff();
    const gained = seedsOnHarvest();
    const [confirmHarvest, setConfirmHarvest] = useState(false);
    // How many buildings one click buys. 0 means as many as you can afford.
    const [amount, setAmount] = useState(1);

    useEffect(() => {
        if (!confirmHarvest) return;
        const t = setTimeout(() => setConfirmHarvest(false), 5000);
        return () => clearTimeout(t);
    }, [confirmHarvest]);

    return (
        <div>
            <div className="vc-lounge-stats">
                <span className="vc-lounge-coins">{formatNumber(state.coins)} coins</span>
                <span className="vc-lounge-muted">{formatNumber(cps())} per second</span>
                <span className="vc-lounge-muted">Bonus x{formatNumber(permanentMultiplier())}</span>
                {buff && (
                    <span className="vc-lounge-buff">
                        Frenzy x{buff.mult} ({Math.ceil((buff.until - Date.now()) / 1000)}s)
                    </span>
                )}
            </div>

            <div className="vc-lounge-farm">
                <div>
                    <Field />
                    <p className="vc-lounge-muted">
                        Click the field to water it. A golden butterfly drops by from time to time: catch it for a bonus.
                    </p>

                    <div className="vc-lounge-section">Harvest</div>
                    <p className="vc-lounge-muted">
                        Start the farm over for seeds. Each seed is a permanent +5% to everything. You hold {formatNumber(seedsAvailable())}.
                    </p>
                    <button
                        className="vc-lounge-btn"
                        data-variant={confirmHarvest ? "danger" : undefined}
                        disabled={gained < 1}
                        onClick={() => {
                            if (!confirmHarvest) return setConfirmHarvest(true);
                            harvest();
                            setConfirmHarvest(false);
                        }}
                    >
                        {gained < 1
                            ? "Earn 1M coins in a run to harvest"
                            : confirmHarvest ? `Really reset for ${formatNumber(gained)} seeds?` : `Harvest for ${formatNumber(gained)} seeds`}
                    </button>
                </div>

                <div className="vc-lounge-list">
                    <div className="vc-lounge-row-actions" role="group" aria-label="Buy amount">
                        <span className="vc-lounge-muted">Buy:</span>
                        {[1, 10, 100, 0].map(a => (
                            <button
                                key={a}
                                className="vc-lounge-btn"
                                data-variant={amount === a ? undefined : "secondary"}
                                onClick={() => setAmount(a)}
                            >
                                {a === 0 ? "Max" : `x${a}`}
                            </button>
                        ))}
                    </div>
                    {GENERATORS.map(g => {
                        const count = owned(g.id);
                        const n = amount === 0 ? Math.max(1, maxAffordable(g)) : amount;
                        const cost = n === 1 ? generatorCost(g) : bulkCost(g, n);
                        const next = nextTier(g);
                        const visible = count > 0 || state.totalEarned >= g.baseCost * 0.5 || state.coins >= g.baseCost;
                        if (!visible) return null;

                        return (
                            <div className="vc-lounge-row" key={g.id}>
                                <div>
                                    <div className="vc-lounge-row-title">{g.name} <span className="vc-lounge-muted">x{count}</span></div>
                                    <div className="vc-lounge-muted">
                                        {g.blurb} {count > 0 && `Makes ${formatNumber(generatorCps(g) * permanentMultiplier())}/s.`}
                                    </div>
                                </div>
                                <div className="vc-lounge-row-actions">
                                    {next && (
                                        <button
                                            className="vc-lounge-btn"
                                            data-variant="secondary"
                                            disabled={count < next.need || state.coins < next.cost}
                                            title={`Doubles output. Needs ${next.need} owned.`}
                                            onClick={() => buyTier(g.id)}
                                        >
                                            x2 for {formatNumber(next.cost)}
                                        </button>
                                    )}
                                    <button className="vc-lounge-btn" disabled={state.coins < cost} onClick={() => buyGenerator(g.id, amount === 0 ? 5000 : amount)}>
                                        Buy {n > 1 ? `${n} for ` : ""}{formatNumber(cost)}
                                    </button>
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>
        </div>
    );
}
