/*
 * Vencord, a Discord client mod
 * Copyright (c) 2026 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import {
    achievementContext, bountyProgress, bountyReward, buyCompanion, buySeedUpgrade, buyUpgrade, companionCost, companionLevel,
    formatNumber, hasSeedUpgrade, hasUpgrade, seedsAvailable, state
} from "./game";
import { ACHIEVEMENT_BONUS, ACHIEVEMENTS, BOUNTY_KINDS, COMPANIONS, SEED_UPGRADES, UPGRADES } from "./progress";
import { useGame } from "./useGame";

export function Goals() {
    useGame();
    const ctx = achievementContext();
    const unlocked = state.achievements.length;
    const shopLeft = UPGRADES.filter(u => !hasUpgrade(u.id));
    const showSeeds = state.harvests > 0 || seedsAvailable() > 0 || state.seedUpgrades.length > 0;

    return (
        <div>
            <div className="vc-lounge-stats">
                <span className="vc-lounge-coins">{formatNumber(state.coins)} coins</span>
                <span className="vc-lounge-muted">
                    {unlocked}/{ACHIEVEMENTS.length} achievements, +{(unlocked * ACHIEVEMENT_BONUS * 100).toFixed(0)}% to the garden
                </span>
            </div>

            <div className="vc-lounge-fishing">
                <div>
                    <div className="vc-lounge-section">Bounties</div>
                    <p className="vc-lounge-muted">Finish them for a payout of garden income. New ones show up right away.</p>
                    <div className="vc-lounge-list">
                        {state.bounties.map((b, i) => {
                            const def = BOUNTY_KINDS.find(k => k.kind === b.kind)!;
                            const done = bountyProgress(b);
                            return (
                                <div className="vc-lounge-row" key={i}>
                                    <div>
                                        <div className="vc-lounge-row-title">{def.label(b.goal)}</div>
                                        <div className="vc-lounge-muted">
                                            {formatNumber(done)}/{formatNumber(b.goal)}, pays {formatNumber(bountyReward(b))} coins
                                        </div>
                                        <div className="vc-lounge-bar" aria-hidden="true">
                                            <div style={{ width: `${(done / b.goal) * 100}%` }} />
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>

                    <div className="vc-lounge-section">Companions</div>
                    <p className="vc-lounge-muted">They stay with you through Harvest and keep getting stronger.</p>
                    <div className="vc-lounge-list">
                        {COMPANIONS.map(c => {
                            const lvl = companionLevel(c.id);
                            if (lvl === 0 && state.totalEarned < c.unlock) {
                                return (
                                    <div className="vc-lounge-row" key={c.id} style={{ opacity: 0.45 }}>
                                        <div>
                                            <div className="vc-lounge-row-title">???</div>
                                            <div className="vc-lounge-muted">Earn {formatNumber(c.unlock)} coins in total to meet them.</div>
                                        </div>
                                    </div>
                                );
                            }
                            const maxed = lvl >= c.max;
                            return (
                                <div className="vc-lounge-row" key={c.id}>
                                    <div>
                                        <div className="vc-lounge-row-title">{c.name} <span className="vc-lounge-muted">lvl {lvl}/{c.max}</span></div>
                                        <div className="vc-lounge-muted">{c.desc}</div>
                                    </div>
                                    <button className="vc-lounge-btn" disabled={maxed || state.coins < companionCost(c.id)} onClick={() => buyCompanion(c.id)}>
                                        {maxed ? "Maxed" : `${lvl ? "Level up" : "Adopt"} ${formatNumber(companionCost(c.id))}`}
                                    </button>
                                </div>
                            );
                        })}
                    </div>

                    <div className="vc-lounge-section">Garden upgrades</div>
                    <div className="vc-lounge-list">
                        {shopLeft.length === 0 && <div className="vc-lounge-muted">You bought everything.</div>}
                        {shopLeft.map(u => (
                            <div className="vc-lounge-row" key={u.id}>
                                <div>
                                    <div className="vc-lounge-row-title">{u.name}</div>
                                    <div className="vc-lounge-muted">{u.desc}</div>
                                </div>
                                <button className="vc-lounge-btn" disabled={state.coins < u.cost} onClick={() => buyUpgrade(u.id)}>
                                    Buy {formatNumber(u.cost)}
                                </button>
                            </div>
                        ))}
                    </div>

                    {showSeeds && (
                        <>
                            <div className="vc-lounge-section">Seed shop ({formatNumber(seedsAvailable())} seeds to spend)</div>
                            <p className="vc-lounge-muted">These stay with you through every Harvest.</p>
                            <div className="vc-lounge-list">
                                {SEED_UPGRADES.map(u => {
                                    const owned = hasSeedUpgrade(u.id);
                                    return (
                                        <div className="vc-lounge-row" key={u.id}>
                                            <div>
                                                <div className="vc-lounge-row-title">{u.name}</div>
                                                <div className="vc-lounge-muted">{u.desc}</div>
                                            </div>
                                            <button
                                                className="vc-lounge-btn"
                                                data-variant={owned ? "secondary" : undefined}
                                                disabled={owned || seedsAvailable() < u.cost}
                                                onClick={() => buySeedUpgrade(u.id)}
                                            >
                                                {owned ? "Owned" : `${formatNumber(u.cost)} seeds`}
                                            </button>
                                        </div>
                                    );
                                })}
                            </div>
                            <p className="vc-lounge-muted">
                                Spending seeds does not weaken your seed bonus, it still counts every seed you ever earned.
                            </p>
                        </>
                    )}
                </div>

                <div>
                    <div className="vc-lounge-section">Achievements</div>
                    <p className="vc-lounge-muted">Each one adds {ACHIEVEMENT_BONUS * 100}% to all garden output.</p>
                    <div className="vc-lounge-list">
                        {[...ACHIEVEMENTS]
                            .sort((a, b) => Number(state.achievements.includes(a.id)) - Number(state.achievements.includes(b.id)))
                            .map(a => {
                                const done = state.achievements.includes(a.id);
                                const [cur, target] = a.progress(ctx);
                                const shown = target >= 9999;
                                return (
                                    <div className="vc-lounge-row" key={a.id} style={{ opacity: done ? 0.6 : 1 }}>
                                        <div>
                                            <div className="vc-lounge-row-title">{done ? "Done: " : ""}{a.name}</div>
                                            <div className="vc-lounge-muted">{a.desc}</div>
                                            {!done && !shown && (
                                                <div className="vc-lounge-bar" aria-hidden="true">
                                                    <div style={{ width: `${Math.min(100, (cur / target) * 100)}%` }} />
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                );
                            })}
                    </div>
                </div>
            </div>
        </div>
    );
}
