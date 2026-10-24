/*
 * Vencord, a Discord client mod
 * Copyright (c) 2026 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import type { Save } from "./game";

export interface Upgrade {
    id: string;
    name: string;
    desc: string;
    cost: number;
    /** Multiplies all garden output. */
    mult?: number;
    /** Multiplies what fish are worth. */
    fish?: number;
}

export const UPGRADES: Upgrade[] = [
    { id: "trowel", name: "Golden Trowel", desc: "Each click on the field is worth 5x.", cost: 100_000 },
    { id: "tackle", name: "Sturdy Tackle", desc: "One more second to reel a fish in.", cost: 200_000 },
    { id: "soil", name: "Rich Soil", desc: "+25% garden output.", cost: 500_000, mult: 1.25 },
    { id: "scarecrow", name: "Scarecrow", desc: "Golden butterflies show up twice as often.", cost: 2_000_000 },
    { id: "sprinkler", name: "Sprinkler System", desc: "Waters the field 5 times a second for you.", cost: 5_000_000 },
    { id: "bait", name: "Premium Bait", desc: "+100% fish value.", cost: 10_000_000, fish: 2 },
    { id: "charm", name: "Lucky Charm", desc: "Butterfly bonuses are 3x, frenzy lasts 60s.", cost: 30_000_000 },
    { id: "fert", name: "Fertilizer", desc: "+50% garden output.", cost: 40_000_000, mult: 1.5 },
    { id: "net", name: "Trawler Net", desc: "+200% fish value.", cost: 50_000_000, fish: 3 },
    { id: "sonar", name: "Sonar", desc: "Fish bite 30% sooner.", cost: 60_000_000 },
    { id: "irrig", name: "Irrigation", desc: "+100% garden output.", cost: 1_500_000_000, mult: 2 },
    { id: "genetic", name: "Genetic Seeds", desc: "Garden output x2.", cost: 500_000_000_000, mult: 2 },
    { id: "solar", name: "Solar Panels", desc: "+200% garden output.", cost: 80_000_000_000, mult: 3 },
    { id: "spyglass", name: "Spyglass", desc: "Twice the chance for a big or jumbo catch.", cost: 1_000_000_000_000 },
    { id: "deepbait", name: "Deep-Sea Bait", desc: "+200% fish value.", cost: 2_000_000_000_000, fish: 3 },
    { id: "goldenhour", name: "Golden Hour", desc: "Butterfly frenzy is x15 instead of x7.", cost: 5_000_000_000_000 },
    { id: "drones", name: "Drone Swarm", desc: "Garden output x3.", cost: 10_000_000_000_000, mult: 3 },
    { id: "quantum", name: "Quantum Fertilizer", desc: "Garden output x5.", cost: 500_000_000_000_000, mult: 5 },
    { id: "terra", name: "Terraforming", desc: "Garden output x10.", cost: 50_000_000_000_000_000, mult: 10 },
    { id: "multiverse", name: "Multiverse Farming", desc: "Garden output x25.", cost: 5_000_000_000_000_000_000, mult: 25 }
];

export const SEED_UPGRADES: Upgrade[] = [
    { id: "head", name: "Head Start", desc: "Every new run begins with 100K coins.", cost: 3 },
    { id: "cheap", name: "Bulk Orders", desc: "Buildings cost 10% less.", cost: 8 },
    { id: "lucky", name: "Lucky Seed", desc: "Golden butterflies show up twice as often again.", cost: 10 },
    { id: "thumb", name: "Green Thumb", desc: "+25% garden output.", cost: 12 },
    { id: "clock", name: "Time Lapse", desc: "The farm earns at full speed while you are away.", cost: 15 },
    { id: "ground", name: "Fertile Ground", desc: "Garden output x2.", cost: 500, mult: 2 },
    { id: "lucky2", name: "Butterfly Meadow", desc: "Golden butterflies show up twice as often again.", cost: 1_000 },
    { id: "fisher", name: "Fisher King", desc: "+300% fish value.", cost: 2_000, fish: 4 },
    { id: "head2", name: "Eternal Head Start", desc: "Every new run begins with 1T coins.", cost: 2_000 },
    { id: "brick", name: "Brick Lord", desc: "Bricks give 3x shards.", cost: 3_000 },
    { id: "roots", name: "Deep Roots", desc: "Garden output x3.", cost: 5_000, mult: 3 },
    { id: "ancient", name: "Ancient Orchard", desc: "Garden output x5.", cost: 50_000, mult: 5 },
    { id: "worldseed", name: "World Seed", desc: "Garden output x10.", cost: 500_000, mult: 10 },
    { id: "starfall", name: "Starfall Fertilizer", desc: "Garden output x20.", cost: 5e6, mult: 20 },
    { id: "leviathan", name: "Leviathan Contract", desc: "+1000% fish value.", cost: 1e7, fish: 11 },
    { id: "nebula", name: "Nebula Compost", desc: "Garden output x50.", cost: 1e8, mult: 50 },
    { id: "quasar", name: "Quasar Roots", desc: "Garden output x100.", cost: 1e9, mult: 100 },
    { id: "horizon", name: "Event Horizon Tilling", desc: "Garden output x500.", cost: 1e10, mult: 500 },
    { id: "abyssal", name: "Abyssal Pact", desc: "+10000% fish value.", cost: 1e10, fish: 101 },
    { id: "singularity", name: "Singularity Seeds", desc: "Garden output x2000.", cost: 1e11, mult: 2000 },
    { id: "bigbang", name: "Big Bang Soil", desc: "Garden output x10000.", cost: 1e12, mult: 10_000 },
    { id: "omniverse", name: "Omniverse Crop", desc: "Garden output x100000.", cost: 1e13, mult: 100_000 }
];

export interface Companion {
    id: string;
    name: string;
    desc: string;
    baseCost: number;
    growth: number;
    max: number;
    /** Total coins earned before this companion shows up. */
    unlock: number;
}

export const COMPANIONS: Companion[] = [
    { id: "dog", name: "Farm Dog", desc: "+4% garden output per level.", baseCost: 2e8, growth: 1.55, max: 40, unlock: 1e8 },
    { id: "owl", name: "Barn Owl", desc: "+10% fish value per level (adds to the other fish bonuses).", baseCost: 1e9, growth: 1.6, max: 30, unlock: 5e8 },
    { id: "gnome", name: "Garden Gnome", desc: "+15% butterfly rewards per level.", baseCost: 5e9, growth: 1.6, max: 25, unlock: 2e9 },
    { id: "queen", name: "Bee Queen", desc: "+6% Beehive output per level.", baseCost: 2e10, growth: 1.6, max: 40, unlock: 1e10 },
    { id: "cat", name: "Fishing Cat", desc: "Fish bite 2% sooner per level.", baseCost: 1e11, growth: 1.8, max: 15, unlock: 5e10 },
    { id: "golem", name: "Clay Golem", desc: "+25% click value per level.", baseCost: 5e11, growth: 1.6, max: 30, unlock: 2e11 },
    { id: "dragon", name: "Garden Dragon", desc: "+8% garden output per level.", baseCost: 1e13, growth: 1.7, max: 40, unlock: 5e12 },
    { id: "fox", name: "Time Fox", desc: "+2% to everything per level, fish and bricks too.", baseCost: 1e15, growth: 1.9, max: 25, unlock: 5e14 },
    { id: "phoenix", name: "Phoenix", desc: "+15% garden output per level.", baseCost: 1e24, growth: 1.6, max: 60, unlock: 1e22 },
    { id: "kraken", name: "Kraken", desc: "+25% fish value per level.", baseCost: 1e26, growth: 1.6, max: 40, unlock: 1e24 },
    { id: "whale", name: "Star Whale", desc: "+5% garden output and fish value per level.", baseCost: 1e28, growth: 1.55, max: 80, unlock: 1e26 }
];

export const LINE_COSTS = [1e9, 2e10, 4e11, 8e12, 1.6e14];
export const MAX_LINES = LINE_COSTS.length + 1;

// Everything an achievement may need to look at, built once per check.
export interface Ctx {
    s: Save;
    cps: number;
    species: number;
    totalSpecies: number;
    buildings: number;
    types: number;
    totalTypes: number;
    fish: number;
    caughtRarity: Record<string, number>;
    maxRod: number;
    companionLevels: number;
}

export interface Achievement {
    id: string;
    name: string;
    desc: string;
    test: (c: Ctx) => boolean;
    /** Current and target value, for the progress bar. */
    progress: (c: Ctx) => [number, number];
}

function milestone(id: string, name: string, desc: string, value: (c: Ctx) => number, target: number): Achievement {
    return {
        id, name, desc,
        test: c => value(c) >= target,
        progress: c => [Math.min(value(c), target), target]
    };
}

function series(prefix: string, names: string[], targets: number[], descFn: (n: number) => string, value: (c: Ctx) => number) {
    return targets.map((t, i) => milestone(`${prefix}-${i}`, names[i], descFn(t), value, t));
}

const SUFFIX = ["", "K", "M", "B", "T", "Qa", "Qi", "Sx", "Sp", "Oc", "No", "Dc", "Ud", "Dd", "Td", "Qad", "Qid", "Sxd"];
const fmt = (n: number) => {
    if (n < 1000) return `${n}`;
    const tier = Math.floor(Math.log10(n) / 3);
    if (tier >= SUFFIX.length) return n.toExponential(1).replace("e+", "e");
    return parseFloat((n / 1000 ** tier).toFixed(2)) + SUFFIX[tier];
};

export const ACHIEVEMENTS: Achievement[] = [
    ...series("earn", ["Pocket Change", "Millionaire", "Billionaire", "Trillionaire", "Quadrillionaire", "Quintillionaire", "Sextillionaire", "Septillionaire", "Octillionaire", "Nonillionaire", "Decillionaire", "Undecillionaire", "Duodecillionaire"],
        [1e3, 1e6, 1e9, 1e12, 1e15, 1e18, 1e21, 1e24, 1e27, 1e30, 1e33, 1e36, 1e42],
        n => `Earn ${fmt(n)} coins in total.`, c => c.s.totalEarned),
    ...series("cps", ["Green Sprout", "Busy Farm", "Agribusiness", "Breadbasket", "Food Empire", "Planetary Harvest", "Stellar Output", "Galactic Yield", "Universal Supply", "Beyond Measure"],
        [10, 1e3, 1e5, 1e7, 1e9, 1e12, 1e15, 1e20, 1e26, 1e33],
        n => `Reach ${fmt(n)} coins per second.`, c => c.cps),
    ...series("own", ["Landowner", "Homestead", "Estate", "Dynasty", "Megafarm", "Continent", "Planet", "Solar System"], [10, 50, 150, 400, 1000, 2500, 6000, 15000],
        n => `Own ${n} buildings at once.`, c => c.buildings),
    milestone("types-9", "Variety Pack", "Own 9 different buildings.", c => c.types, 9),
    { id: "types-all", name: "One of Everything", desc: "Own every kind of building.", test: c => c.types >= c.totalTypes, progress: c => [c.types, c.totalTypes] },
    ...series("click", ["Gentle Rain", "Downpour", "Monsoon", "Flood"], [100, 1000, 10000, 100000],
        n => `Water the field ${n} times.`, c => c.s.stats.clicks),
    ...series("fly", ["Net Ready", "Collector", "Lepidopterist", "Butterfly Effect"], [1, 10, 50, 250],
        n => `Catch ${n} golden ${n === 1 ? "butterfly" : "butterflies"}.`, c => c.s.stats.butterflies),
    ...series("fish", ["First Bite", "Angler", "Seasoned Angler", "Old Salt", "Leviathan Hunter"], [1, 25, 250, 2500, 25000],
        n => `Catch ${n} fish.`, c => c.fish),
    ...series("species", ["Curious", "Fanatic", "Completionist"], [5, 15, 9999],
        n => n >= 9999 ? "Discover every species." : `Discover ${n} species.`, c => c.species >= c.totalSpecies ? 9999 : c.species),
    milestone("rare", "Rare Find", "Catch an epic fish.", c => c.caughtRarity.epic ?? 0, 1),
    milestone("legend", "Legend of the Lake", "Catch a legendary fish.", c => c.caughtRarity.legendary ?? 0, 1),
    milestone("myth", "Myth Made Real", "Catch a mythic fish.", c => c.caughtRarity.mythic ?? 0, 1),
    milestone("jumbo", "That One Was Huge", "Land a jumbo catch.", c => c.s.stats.jumbo, 1),
    milestone("jumbo-25", "Fish Story", "Land 25 jumbo catches.", c => c.s.stats.jumbo, 25),
    milestone("rod-3", "Serious Gear", "Own a Carbon Rod or better.", c => c.s.rod, 3),
    { id: "rod-max", name: "Fully Kitted", desc: "Own the best rod.", test: c => c.s.rod >= c.maxRod, progress: c => [c.s.rod, c.maxRod] },
    milestone("lines-3", "Three Lines", "Fish with 3 lines at once.", c => c.s.lines, 3),
    milestone("lines-6", "Fishing Fleet", "Fish with 6 lines at once.", c => c.s.lines, 6),
    ...series("brick", ["Wall Breaker", "Demolition", "Wrecking Crew", "Unstoppable", "Brickpocalypse"], [5, 15, 30, 60, 120],
        n => `Reach Bricks level ${n}.`, c => c.s.brickLevel),
    milestone("balls-10", "Ball Pit", "Own 10 balls.", c => c.s.balls, 10),
    milestone("balls-30", "Maximum Balls", "Own 30 balls.", c => c.s.balls, 30),
    ...series("rubble", ["Rubble", "Quarry", "Mountain Mover"], [100, 2500, 50000],
        n => `Break ${n} bricks.`, c => c.s.stats.bricks),
    ...series("pet", ["Best Friend", "Zoo Keeper", "Beast Master"], [1, 50, 200],
        n => n === 1 ? "Adopt a companion." : `Reach ${n} companion levels in total.`, c => c.companionLevels),
    ...series("bounty", ["Odd Jobs", "Reliable", "Guild Veteran"], [5, 50, 250],
        n => `Finish ${n} bounties.`, c => c.s.stats.bounties),
    ...series("harvest", ["Fresh Start", "Seasoned Farmer", "Perennial"], [1, 5, 20],
        n => `Harvest ${n === 1 ? "once" : `${n} times`}.`, c => c.s.harvests),
    ...series("seeds", ["Seed Hoarder", "Seed Baron", "Seed Emperor", "Seed God"], [100, 1e6, 1e9, 1e12],
        n => `Collect ${fmt(n)} seeds in total.`, c => c.s.seeds),
    milestone("shop-6", "Shopper", "Buy 6 garden upgrades.", c => c.s.upgrades.length, 6),
    milestone("shop-all", "Fully Upgraded", "Buy every garden upgrade.", c => c.s.upgrades.length, UPGRADES.length),
    milestone("ach-20", "Overachiever", "Unlock 20 achievements.", c => c.s.achievements.length, 20),
    milestone("ach-40", "Trophy Room", "Unlock 40 achievements.", c => c.s.achievements.length, 40)
];

// Each unlocked achievement adds this much to all garden output.
export const ACHIEVEMENT_BONUS = 0.02;

export type BountyKind = "clicks" | "fish" | "butterflies" | "bricks" | "bought";

export const BOUNTY_KINDS: { kind: BountyKind; label: (n: number) => string; goals: number[]; }[] = [
    { kind: "clicks", label: n => `Water the field ${n} times`, goals: [100, 250, 500] },
    { kind: "fish", label: n => `Catch ${n} fish`, goals: [8, 20, 40] },
    { kind: "butterflies", label: n => `Catch ${n} golden ${n === 1 ? "butterfly" : "butterflies"}`, goals: [1, 2, 4] },
    { kind: "bricks", label: n => `Break ${n} bricks`, goals: [40, 120, 300] },
    { kind: "bought", label: n => `Buy ${n} buildings`, goals: [10, 25, 60] }
];

// Daily quests: bigger goals than bounties, three a day, picked fresh each morning.
export const DAILY_GOALS: Record<BountyKind, number> = { clicks: 400, fish: 30, butterflies: 3, bricks: 250, bought: 20 };

// Minutes of garden income each tier of bounty pays out.
export const BOUNTY_MINUTES = [10, 25, 50];
