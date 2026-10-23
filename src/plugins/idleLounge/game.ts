/*
 * Vencord, a Discord client mod
 * Copyright (c) 2026 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import * as DataStore from "@api/DataStore";

import { DiskSave, flushDiskWrite, readDisk, scheduleDiskWrite } from "./disk";
import {
    ACHIEVEMENT_BONUS, ACHIEVEMENTS, BOUNTY_KINDS, BOUNTY_MINUTES, BountyKind, COMPANIONS, Ctx, LINE_COSTS, MAX_LINES, SEED_UPGRADES, UPGRADES
} from "./progress";
import { allStats, restoreStats, setStatListener } from "./storage";

const SAVE_KEY = "IdleLounge_save";
const TICK_MS = 500;
const SAVE_MS = 15_000;
// A gap this long means the client was closed or asleep, not just throttled.
const OFFLINE_GAP_MS = 2 * 60_000;
const OFFLINE_CAP_MS = 8 * 60 * 60_000;
const OFFLINE_EFFICIENCY = 0.5;

export interface Generator {
    id: string;
    name: string;
    blurb: string;
    baseCost: number;
    baseCps: number;
}

export const GENERATORS: Generator[] = [
    { id: "carrot", name: "Carrot Patch", blurb: "Slow, steady, reliable.", baseCost: 15, baseCps: 0.1 },
    { id: "wheat", name: "Wheat Field", blurb: "Golden rows to the horizon.", baseCost: 100, baseCps: 1 },
    { id: "berry", name: "Berry Bushes", blurb: "Pickers never run out of baskets.", baseCost: 1_100, baseCps: 8 },
    { id: "pumpkin", name: "Pumpkin Plot", blurb: "Huge, orange, very profitable.", baseCost: 12_000, baseCps: 47 },
    { id: "beehive", name: "Beehive Row", blurb: "Honey sells itself.", baseCost: 130_000, baseCps: 260 },
    { id: "windmill", name: "Windmill", blurb: "Grinds the whole valley's flour.", baseCost: 1_400_000, baseCps: 1_400 },
    { id: "orchard", name: "Orchard", blurb: "Apples, pears, and a long wait.", baseCost: 20_000_000, baseCps: 7_800 },
    { id: "greenhouse", name: "Greenhouse", blurb: "Summer all year round.", baseCost: 330_000_000, baseCps: 44_000 },
    { id: "hydro", name: "Hydroponic Towers", blurb: "Soil is optional.", baseCost: 5.1e9, baseCps: 260_000 },
    { id: "robot", name: "Harvest Bots", blurb: "They never take a break.", baseCost: 7.5e10, baseCps: 1.6e6 },
    { id: "weather", name: "Weather Machine", blurb: "Sunshine on demand.", baseCost: 1e12, baseCps: 1e7 },
    { id: "island", name: "Floating Island", blurb: "Farmland with a view.", baseCost: 1.4e13, baseCps: 6.5e7 },
    { id: "timegarden", name: "Time Garden", blurb: "Harvest it yesterday.", baseCost: 1.7e14, baseCps: 4.3e8 },
    { id: "rift", name: "Rift Orchard", blurb: "Fruit from a few other worlds.", baseCost: 2.1e15, baseCps: 2.9e9 },
    { id: "nursery", name: "Star Nursery", blurb: "Grows tiny suns.", baseCost: 2.6e16, baseCps: 2e10 },
    { id: "worldtree", name: "World Tree", blurb: "The roots go very deep.", baseCost: 3.1e17, baseCps: 1.4e11 },
    { id: "cosmic", name: "Cosmic Garden", blurb: "Plant a galaxy.", baseCost: 4.5e18, baseCps: 1e12 },
    { id: "omega", name: "Omega Field", blurb: "The last field, and then some.", baseCost: 6.5e19, baseCps: 7.5e12 },
    { id: "dream", name: "Dream Meadow", blurb: "Grows while you sleep, literally.", baseCost: 9e20, baseCps: 5.5e13 },
    { id: "grove", name: "Mythic Grove", blurb: "Every tree has a legend.", baseCost: 1.3e22, baseCps: 4e14 },
    { id: "eternity", name: "Eternity Mill", blurb: "Grinds time into flour.", baseCost: 1.9e23, baseCps: 3e15 },
    { id: "galaxyfarm", name: "Galaxy Farm", blurb: "A few billion suns of sunshine.", baseCost: 2.8e24, baseCps: 2.2e16 },
    { id: "universe", name: "Universe Seed", blurb: "Plant it, wait, enjoy a cosmos.", baseCost: 4e25, baseCps: 1.6e17 },
    { id: "lastharvest", name: "The Last Harvest", blurb: "There is nothing after this. Almost.", baseCost: 6e26, baseCps: 1.2e18 },
    { id: "loom", name: "Reality Loom", blurb: "Weaves fields out of nothing.", baseCost: 8e27, baseCps: 9e18 },
    { id: "voidgarden", name: "Void Garden", blurb: "Flowers that grow in the dark.", baseCost: 1.1e29, baseCps: 7e19 },
    { id: "spring", name: "Eternal Spring", blurb: "It is always the right season.", baseCost: 1.5e30, baseCps: 5e20 },
    { id: "sunforge", name: "Sun Forge Farm", blurb: "Harvest heat, sell light.", baseCost: 2e31, baseCps: 3.8e21 },
    { id: "dimorchard", name: "Dimension Orchard", blurb: "Every branch is another universe.", baseCost: 2.8e32, baseCps: 2.8e22 },
    { id: "web", name: "Cosmic Web Farm", blurb: "Strands of galaxies, picked daily.", baseCost: 4e33, baseCps: 2e23 },
    { id: "primordial", name: "Primordial Field", blurb: "The first soil there ever was.", baseCost: 5.5e34, baseCps: 1.5e24 },
    { id: "source", name: "The Source", blurb: "Where all gardens begin.", baseCost: 8e35, baseCps: 1.1e25 }
];

const COST_GROWTH = 1.15;
export const TIER_THRESHOLDS = [10, 25, 50, 100, 150, 200, 300, 400, 500, 750, 1000];
const TIER_COST_FACTOR = [50, 500, 5_000, 50_000, 5e5, 5e6, 5e7, 5e8, 5e9, 5e10, 5e11];

export interface Species {
    id: string;
    name: string;
    rarity: "common" | "uncommon" | "rare" | "epic" | "legendary" | "mythic";
    weight: number;
    color: string;
    accent: string;
    size: number;
}

export const RARITY_ORDER = ["common", "uncommon", "rare", "epic", "legendary", "mythic"] as const;
export const RARITY_REWARD: Record<Species["rarity"], number> = {
    common: 1, uncommon: 2.5, rare: 8, epic: 30, legendary: 150, mythic: 1200
};
export const RARITY_COLOR: Record<Species["rarity"], string> = {
    common: "#9aa3ad", uncommon: "#5fbf6a", rare: "#4aa3e8", epic: "#b36be0", legendary: "#f0b232", mythic: "#ff5fa2"
};

const RAW_SPECIES: Species[] = [
    { id: "minnow", name: "Minnow", rarity: "common", weight: 60, color: "#9fb4c4", accent: "#6f8798", size: 16 },
    { id: "perch", name: "Perch", rarity: "common", weight: 50, color: "#8aa05a", accent: "#d98c3a", size: 22 },
    { id: "roach", name: "Roach", rarity: "common", weight: 45, color: "#b9c4cc", accent: "#c4574a", size: 20 },
    { id: "trout", name: "Trout", rarity: "uncommon", weight: 25, color: "#c58f7a", accent: "#7a4c3c", size: 28 },
    { id: "carp", name: "Carp", rarity: "uncommon", weight: 22, color: "#b0894f", accent: "#7d5d2a", size: 32 },
    { id: "catfish", name: "Catfish", rarity: "uncommon", weight: 18, color: "#6b6f6c", accent: "#3d403e", size: 34 },
    { id: "pike", name: "Pike", rarity: "rare", weight: 9, color: "#5c8f5a", accent: "#e0d27a", size: 40 },
    { id: "salmon", name: "Salmon", rarity: "rare", weight: 8, color: "#e08470", accent: "#b04a38", size: 36 },
    { id: "koi", name: "Koi", rarity: "rare", weight: 6, color: "#f2efe9", accent: "#e8552e", size: 34 },
    { id: "swordfish", name: "Swordfish", rarity: "epic", weight: 3, color: "#5a78a8", accent: "#c9d6ea", size: 52 },
    { id: "lanternfish", name: "Lanternfish", rarity: "epic", weight: 2.5, color: "#2f4a6b", accent: "#7df0ff", size: 30 },
    { id: "arowana", name: "Golden Arowana", rarity: "legendary", weight: 0.8, color: "#f0b232", accent: "#fff0b0", size: 48 },
    { id: "leviathan", name: "Moonfin Leviathan", rarity: "legendary", weight: 0.4, color: "#8e9cf0", accent: "#e6e9ff", size: 60 },
    { id: "goby", name: "Goby", rarity: "common", weight: 40, color: "#c2b58a", accent: "#8a7c52", size: 14 },
    { id: "bleak", name: "Bleak", rarity: "common", weight: 35, color: "#d5dde2", accent: "#9fb0ba", size: 18 },
    { id: "bream", name: "Bream", rarity: "uncommon", weight: 20, color: "#b8a77a", accent: "#7a6a3e", size: 30 },
    { id: "tench", name: "Tench", rarity: "uncommon", weight: 16, color: "#5f7a4a", accent: "#3a4d2c", size: 30 },
    { id: "eel", name: "River Eel", rarity: "uncommon", weight: 14, color: "#4a5a46", accent: "#d8d27a", size: 40 },
    { id: "puffer", name: "Pufferfish", rarity: "rare", weight: 7, color: "#e6d67a", accent: "#b4903a", size: 28 },
    { id: "clown", name: "Clownfish", rarity: "rare", weight: 6, color: "#ef7a2a", accent: "#ffffff", size: 22 },
    { id: "barracuda", name: "Barracuda", rarity: "rare", weight: 5, color: "#9aa9b6", accent: "#4b5a67", size: 46 },
    { id: "angler", name: "Anglerfish", rarity: "epic", weight: 2.5, color: "#3b2f4a", accent: "#ffe27a", size: 34 },
    { id: "manta", name: "Manta Ray", rarity: "epic", weight: 2, color: "#2f4a6a", accent: "#bcd2ea", size: 58 },
    { id: "glasseel", name: "Glass Eel", rarity: "epic", weight: 2, color: "#cfe9f2", accent: "#7ac2d8", size: 36 },
    { id: "phoenixkoi", name: "Phoenix Koi", rarity: "legendary", weight: 0.6, color: "#ff8a3a", accent: "#ffe27a", size: 44 },
    { id: "betta", name: "Celestial Betta", rarity: "legendary", weight: 0.5, color: "#7a5af0", accent: "#e8c2ff", size: 40 },
    { id: "whale", name: "Abyssal Whale", rarity: "legendary", weight: 0.3, color: "#1f3a5a", accent: "#7ad0ff", size: 72 },
    { id: "sturgeon", name: "Starlight Sturgeon", rarity: "mythic", weight: 0.12, color: "#f2f4ff", accent: "#ffd27a", size: 62 },
    { id: "voidangler", name: "Void Angler", rarity: "mythic", weight: 0.08, color: "#120a24", accent: "#ff5fa2", size: 54 }
];

export const SPECIES: Species[] = [...RAW_SPECIES].sort(
    (a, b) => RARITY_ORDER.indexOf(a.rarity) - RARITY_ORDER.indexOf(b.rarity) || b.weight - a.weight
);

export interface Rod {
    name: string;
    cost: number;
}

export const RODS: Rod[] = [
    { name: "Twig Rod", cost: 0 },
    { name: "Bamboo Rod", cost: 500 },
    { name: "Fiberglass Rod", cost: 15_000 },
    { name: "Carbon Rod", cost: 400_000 },
    { name: "Gilded Rod", cost: 10_000_000 },
    { name: "Starlight Rod", cost: 300_000_000 },
    { name: "Prism Rod", cost: 3_000_000_000 },
    { name: "Void Rod", cost: 100_000_000_000 },
    { name: "Cosmic Rod", cost: 3_000_000_000_000 }
];

export const AUTO_FISHER_COST = 25_000;
const SPECIES_BONUS = 0.02;
const SEED_BONUS = 0.05;
const BRICK_BONUS = 0.01;
export const MAX_BALLS = 30;
export const MAX_SPEED = 6;
export const MAX_CRIT = 20;
export const MAX_SPLASH = 5;
export const MAX_MAGNET = 20;
export const MAX_AUTO = 8;

export interface Bounty {
    kind: BountyKind;
    tier: number;
    goal: number;
    start: number;
}

export interface Save {
    coins: number;
    runEarned: number;
    totalEarned: number;
    gens: Record<string, number>;
    tiers: Record<string, number>;
    seeds: number;
    harvests: number;
    caught: Record<string, number>;
    rod: number;
    autoFisher: boolean;
    autoFisherOn: boolean;
    brickLevel: number;
    shards: number;
    balls: number;
    power: number;
    speed: number;
    achievements: string[];
    upgrades: string[];
    seedUpgrades: string[];
    spentSeeds: number;
    stats: { clicks: number; butterflies: number; bricks: number; bounties: number; jumbo: number; bought: number; };
    companions: Record<string, number>;
    lines: number;
    crit: number;
    splash: number;
    magnet: number;
    auto: number;
    bounties: Bounty[];
    lastTick: number;
}

function freshSave(): Save {
    return {
        coins: 0,
        runEarned: 0,
        totalEarned: 0,
        gens: {},
        tiers: {},
        seeds: 0,
        harvests: 0,
        caught: {},
        rod: 0,
        autoFisher: false,
        autoFisherOn: true,
        brickLevel: 1,
        shards: 0,
        balls: 1,
        power: 1,
        speed: 0,
        achievements: [],
        upgrades: [],
        seedUpgrades: [],
        spentSeeds: 0,
        stats: { clicks: 0, butterflies: 0, bricks: 0, bounties: 0, jumbo: 0, bought: 0 },
        companions: {},
        lines: 1,
        crit: 0,
        splash: 0,
        magnet: 0,
        auto: 0,
        bounties: [],
        lastTick: Date.now()
    };
}

export const state: Save = freshSave();

interface Buff {
    mult: number;
    until: number;
}

let buff: Buff | null = null;
const listeners = new Set<() => void>();
let tickTimer: ReturnType<typeof setInterval> | undefined;
let saveTimer: ReturnType<typeof setInterval> | undefined;
let dirty = false;
let offlineReport: { seconds: number; coins: number; } | null = null;

export function subscribe(fn: () => void) {
    listeners.add(fn);
    return () => { listeners.delete(fn); };
}

function emit() {
    listeners.forEach(fn => fn());
}

export function owned(id: string) {
    return state.gens[id] ?? 0;
}

export function tierOf(id: string) {
    return state.tiers[id] ?? 0;
}

export function generatorCost(g: Generator, count = owned(g.id)): number {
    return Math.ceil(g.baseCost * COST_GROWTH ** count * (hasSeedUpgrade("cheap") ? 0.9 : 1));
}

export function tierCost(g: Generator, tier: number) {
    return g.baseCost * TIER_COST_FACTOR[tier];
}

export function speciesDiscovered() {
    return SPECIES.filter(s => (state.caught[s.id] ?? 0) > 0).length;
}

export function activeBuff(): Buff | null {
    if (buff && buff.until <= Date.now()) buff = null;
    return buff;
}

export const hasUpgrade = (id: string) => state.upgrades.includes(id);
export const hasSeedUpgrade = (id: string) => state.seedUpgrades.includes(id);
export const seedsAvailable = () => state.seeds - state.spentSeeds;

export const companionLevel = (id: string) => state.companions[id] ?? 0;
const foxMultiplier = () => 1 + companionLevel("fox") * 0.02;

function upgradeMultiplier() {
    let m = 1;
    for (const u of UPGRADES) if (u.mult && hasUpgrade(u.id)) m *= u.mult;
    for (const u of SEED_UPGRADES) if (u.mult && hasSeedUpgrade(u.id)) m *= u.mult;
    if (hasSeedUpgrade("thumb")) m *= 1.25;
    m *= (1 + companionLevel("dog") * 0.04) * (1 + companionLevel("dragon") * 0.08) * (1 + companionLevel("phoenix") * 0.15)
        * (1 + companionLevel("whale") * 0.05) * foxMultiplier();
    return m;
}

export function permanentMultiplier() {
    return (1 + state.seeds * SEED_BONUS)
        * (1 + speciesDiscovered() * SPECIES_BONUS)
        * (1 + (state.brickLevel - 1) * BRICK_BONUS)
        * (1 + state.achievements.length * ACHIEVEMENT_BONUS)
        * upgradeMultiplier();
}

// Fishing bonuses add together instead of multiplying, so stacking them stays sane.
export function fishValueMultiplier() {
    let bonus = 1 + companionLevel("owl") * 0.1 + companionLevel("kraken") * 0.25 + companionLevel("whale") * 0.05;
    for (const u of UPGRADES) if (u.fish && hasUpgrade(u.id)) bonus += u.fish - 1;
    for (const u of SEED_UPGRADES) if (u.fish && hasSeedUpgrade(u.id)) bonus += u.fish - 1;
    return bonus * foxMultiplier();
}

// How much sooner golden butterflies come back, as a multiplier on the wait.
export const butterflyDelayFactor = () => (hasUpgrade("scarecrow") ? 0.5 : 1) * (hasSeedUpgrade("lucky") ? 0.5 : 1) * (hasSeedUpgrade("lucky2") ? 0.5 : 1);

const offlineEfficiency = () => (hasSeedUpgrade("clock") ? 1 : OFFLINE_EFFICIENCY);

export function generatorCps(g: Generator) {
    return owned(g.id) * g.baseCps * 2 ** tierOf(g.id) * (g.id === "beehive" ? 1 + companionLevel("queen") * 0.06 : 1);
}

export function baseCps() {
    return GENERATORS.reduce((sum, g) => sum + generatorCps(g), 0) * permanentMultiplier();
}

export function cps() {
    return baseCps() * (activeBuff()?.mult ?? 1);
}

export function clickValue() {
    return (1 + baseCps() * 0.02) * (hasUpgrade("trowel") ? 5 : 1) * (1 + companionLevel("golem") * 0.25) * (activeBuff()?.mult ?? 1);
}

export function seedsOnHarvest() {
    return Math.floor(Math.sqrt(state.runEarned / 1_000_000));
}

function earn(amount: number) {
    state.coins += amount;
    state.runEarned += amount;
    state.totalEarned += amount;
    dirty = true;
}

export function click() {
    state.stats.clicks++;
    earn(clickValue());
    emit();
}

export function buyGenerator(id: string, amount = 1) {
    const g = GENERATORS.find(x => x.id === id);
    if (!g) return false;

    let bought = 0;
    for (let i = 0; i < amount; i++) {
        const cost = generatorCost(g);
        if (state.coins < cost) break;
        state.coins -= cost;
        state.gens[id] = owned(id) + 1;
        state.stats.bought++;
        bought++;
    }
    if (bought) { dirty = true; emit(); }
    return bought > 0;
}

export function bulkCost(g: Generator, n: number) {
    const have = owned(g.id);
    let total = 0;
    for (let i = 0; i < n; i++) total += generatorCost(g, have + i);
    return total;
}

export function maxAffordable(g: Generator) {
    const have = owned(g.id);
    let total = 0;
    let n = 0;
    while (n < 5000) {
        const cost = generatorCost(g, have + n);
        if (total + cost > state.coins) break;
        total += cost;
        n++;
    }
    return n;
}

export function nextTier(g: Generator): { tier: number; cost: number; need: number; } | null {
    const tier = tierOf(g.id);
    if (tier >= TIER_THRESHOLDS.length) return null;
    return { tier, cost: tierCost(g, tier), need: TIER_THRESHOLDS[tier] };
}

export function buyTier(id: string) {
    const g = GENERATORS.find(x => x.id === id);
    if (!g) return false;
    const next = nextTier(g);
    if (!next || owned(id) < next.need || state.coins < next.cost) return false;
    state.coins -= next.cost;
    state.tiers[id] = next.tier + 1;
    dirty = true;
    emit();
    return true;
}

export function buyRod() {
    const next = RODS[state.rod + 1];
    if (!next || state.coins < next.cost) return false;
    state.coins -= next.cost;
    state.rod++;
    dirty = true;
    emit();
    return true;
}

export function buyAutoFisher() {
    if (state.autoFisher || state.coins < AUTO_FISHER_COST) return false;
    state.coins -= AUTO_FISHER_COST;
    state.autoFisher = true;
    dirty = true;
    emit();
    return true;
}

export function setAutoFisher(on: boolean) {
    state.autoFisherOn = on;
    dirty = true;
    emit();
}

export function harvest() {
    const gained = seedsOnHarvest();
    if (gained < 1) return 0;
    state.seeds += gained;
    state.harvests++;
    state.coins = hasSeedUpgrade("head2") ? 1e12 : hasSeedUpgrade("head") ? 100_000 : 0;
    state.runEarned = 0;
    state.gens = {};
    state.tiers = {};
    buff = null;
    dirty = true;
    emit();
    return gained;
}

export const ballCost = () => Math.ceil(10 * 1.32 ** (state.balls - 1));
export const powerCost = () => Math.ceil(15 * 1.45 ** (state.power - 1));
export const speedCost = () => 150 * 3 ** state.speed;
export const critCost = () => Math.ceil(400 * 1.9 ** state.crit);
export const splashCost = () => 5_000 * 3 ** state.splash;
export const magnetCost = () => Math.ceil(800 * 2.2 ** state.magnet);
export const autoCost = () => Math.ceil(20_000 * 3.2 ** state.auto);

export function earnShards(n: number) {
    state.shards += n * (1 + state.magnet * 0.3) * foxMultiplier() * (hasSeedUpgrade("brick") ? 3 : 1);
    state.stats.bricks++;
    dirty = true;
}

export type BrickUpgrade = "ball" | "power" | "speed" | "crit" | "splash" | "magnet" | "auto";

const BRICK_TABLE: Record<BrickUpgrade, { cost: () => number; level: () => number; max: number; }> = {
    ball: { cost: ballCost, level: () => state.balls, max: MAX_BALLS },
    power: { cost: powerCost, level: () => state.power, max: Infinity },
    speed: { cost: speedCost, level: () => state.speed, max: MAX_SPEED },
    crit: { cost: critCost, level: () => state.crit, max: MAX_CRIT },
    splash: { cost: splashCost, level: () => state.splash, max: MAX_SPLASH },
    magnet: { cost: magnetCost, level: () => state.magnet, max: MAX_MAGNET },
    auto: { cost: autoCost, level: () => state.auto, max: MAX_AUTO }
};

export function buyBrickUpgrade(kind: BrickUpgrade) {
    const entry = BRICK_TABLE[kind];
    const cost = entry.cost();
    if (state.shards < cost || entry.level() >= entry.max) return false;
    state.shards -= cost;
    if (kind === "ball") state.balls++;
    else if (kind === "power") state.power++;
    else state[kind]++;
    dirty = true;
    emit();
    return true;
}

export function brickLevelUp() {
    state.brickLevel++;
    dirty = true;
    emit();
}

export function giveButterflyReward(): string {
    state.stats.butterflies++;
    const rate = baseCps();
    const charm = hasUpgrade("charm");
    if (Math.random() < 0.5) {
        const coins = Math.max(13, rate * 600 * (charm ? 3 : 1) * (1 + companionLevel("gnome") * 0.15));
        earn(coins);
        emit();
        return `Lucky! +${formatNumber(coins)} coins`;
    }
    const mult = hasUpgrade("goldenhour") ? 15 : 7;
    buff = { mult, until: Date.now() + (charm ? 60_000 : 30_000) };
    emit();
    return `Frenzy! Production x${mult} for ${charm ? 60 : 30}s`;
}

export function rollFish(): Species {
    const luck = state.rod * 0.35;
    const weights = SPECIES.map(s => s.weight * (1 + luck * RARITY_ORDER.indexOf(s.rarity)));
    let roll = Math.random() * weights.reduce((a, b) => a + b, 0);
    for (let i = 0; i < SPECIES.length; i++) {
        roll -= weights[i];
        if (roll <= 0) return SPECIES[i];
    }
    return SPECIES[0];
}

export type CatchSize = "normal" | "big" | "jumbo";

export function catchFish(species: Species) {
    const first = !state.caught[species.id];
    state.caught[species.id] = (state.caught[species.id] ?? 0) + 1;

    const jumboChance = hasUpgrade("spyglass") ? 0.04 : 0.02;
    const roll = Math.random();
    let size: CatchSize = "normal";
    let sizeMult = 0.8 + Math.random() * 0.6;
    if (roll < jumboChance) { size = "jumbo"; sizeMult = 10; state.stats.jumbo++; }
    else if (roll < jumboChance + (hasUpgrade("spyglass") ? 0.36 : 0.18)) { size = "big"; sizeMult = 2.5; }

    const reward = RARITY_REWARD[species.rarity] * (30 + baseCps() * 0.015) * fishValueMultiplier() * sizeMult;
    earn(reward);
    emit();
    return { first, reward, size };
}

export function lineCost() {
    return LINE_COSTS[state.lines - 1];
}

export function buyLine() {
    const cost = lineCost();
    if (cost === undefined || state.coins < cost) return false;
    state.coins -= cost;
    state.lines++;
    dirty = true;
    emit();
    return true;
}

export function waitSeconds() {
    return (3 + 5 * 0.8 ** state.rod) * (hasUpgrade("sonar") ? 0.7 : 1) * (1 - companionLevel("cat") * 0.02);
}

export function biteWindowMs() {
    return 1400 + state.rod * 300 + (hasUpgrade("tackle") ? 1000 : 0);
}

export function companionCost(id: string) {
    const c = COMPANIONS.find(x => x.id === id)!;
    return Math.ceil(c.baseCost * c.growth ** companionLevel(id));
}

export function buyCompanion(id: string) {
    const c = COMPANIONS.find(x => x.id === id);
    if (!c || companionLevel(id) >= c.max || state.coins < companionCost(id)) return false;
    state.coins -= companionCost(id);
    state.companions[id] = companionLevel(id) + 1;
    dirty = true;
    emit();
    return true;
}

function bountyStat(kind: BountyKind) {
    switch (kind) {
        case "clicks": return state.stats.clicks;
        case "butterflies": return state.stats.butterflies;
        case "bricks": return state.stats.bricks;
        case "bought": return state.stats.bought;
        case "fish": return SPECIES.reduce((sum, sp) => sum + (state.caught[sp.id] ?? 0), 0);
    }
}

export function bountyProgress(b: Bounty) {
    return Math.min(b.goal, Math.max(0, bountyStat(b.kind) - b.start));
}

export function bountyReward(b: Bounty) {
    return Math.max(1000, baseCps() * BOUNTY_MINUTES[b.tier] * 60);
}

function newBounty(avoid: BountyKind[]): Bounty {
    const pool = BOUNTY_KINDS.filter(k => !avoid.includes(k.kind));
    const def = pool[Math.floor(Math.random() * pool.length)];
    const tier = Math.random() < 0.5 ? 0 : Math.random() < 0.7 ? 1 : 2;
    return { kind: def.kind, tier, goal: def.goals[tier], start: bountyStat(def.kind) };
}

function checkBounties() {
    while (state.bounties.length < 3) state.bounties.push(newBounty(state.bounties.map(b => b.kind)));
    state.bounties.forEach((b, i) => {
        if (bountyProgress(b) < b.goal) return;
        const reward = bountyReward(b);
        earn(reward);
        state.stats.bounties++;
        state.bounties[i] = newBounty(state.bounties.filter((_, j) => j !== i).map(x => x.kind));
        dirty = true;
        achievementHandler?.(`Bounty done: +${formatNumber(reward)} coins`);
    });
}

export function buyUpgrade(id: string) {
    const u = UPGRADES.find(x => x.id === id);
    if (!u || hasUpgrade(id) || state.coins < u.cost) return false;
    state.coins -= u.cost;
    state.upgrades.push(id);
    dirty = true;
    emit();
    return true;
}

export function buySeedUpgrade(id: string) {
    const u = SEED_UPGRADES.find(x => x.id === id);
    if (!u || hasSeedUpgrade(id) || seedsAvailable() < u.cost) return false;
    state.spentSeeds += u.cost;
    state.seedUpgrades.push(id);
    dirty = true;
    emit();
    return true;
}

export function achievementContext(): Ctx {
    const caughtRarity: Record<string, number> = {};
    let fish = 0;
    for (const sp of SPECIES) {
        const n = state.caught[sp.id] ?? 0;
        fish += n;
        if (n) caughtRarity[sp.rarity] = (caughtRarity[sp.rarity] ?? 0) + n;
    }
    return {
        s: state,
        cps: baseCps(),
        species: speciesDiscovered(),
        totalSpecies: SPECIES.length,
        buildings: GENERATORS.reduce((sum, g) => sum + owned(g.id), 0),
        types: GENERATORS.filter(g => owned(g.id) > 0).length,
        totalTypes: GENERATORS.length,
        companionLevels: Object.values(state.companions).reduce((a, b) => a + b, 0),
        fish,
        caughtRarity,
        maxRod: RODS.length - 1
    };
}

let achievementHandler: ((name: string) => void) | undefined;
export function setAchievementHandler(fn: ((name: string) => void) | undefined) {
    achievementHandler = fn;
}

function checkAchievements() {
    const ctx = achievementContext();
    for (const a of ACHIEVEMENTS) {
        if (state.achievements.includes(a.id) || !a.test(ctx)) continue;
        state.achievements.push(a.id);
        dirty = true;
        achievementHandler?.(`Achievement unlocked: ${a.name}`);
    }
}

export function takeOfflineReport() {
    const r = offlineReport;
    offlineReport = null;
    return r;
}

function tick() {
    const now = Date.now();
    let dt = now - state.lastTick;
    state.lastTick = now;
    if (dt <= 0) return;

    let efficiency = 1;
    if (dt > OFFLINE_GAP_MS) {
        dt = Math.min(dt, OFFLINE_CAP_MS);
        efficiency = offlineEfficiency();
    }

    const gain = cps() * (dt / 1000) * efficiency;
    if (gain > 0) earn(gain);
    if (hasUpgrade("sprinkler") && efficiency === 1) earn(clickValue() * 5 * (dt / 1000));
    checkBounties();
    checkAchievements();
    emit();
}

function sanitize(raw: Partial<Save> | undefined) {
    const base = freshSave();
    if (!raw) return base;
    const num = (v: unknown, d: number) => typeof v === "number" && Number.isFinite(v) && v >= 0 ? v : d;
    return {
        ...base,
        coins: num(raw.coins, 0),
        runEarned: num(raw.runEarned, 0),
        totalEarned: num(raw.totalEarned, 0),
        gens: raw.gens && typeof raw.gens === "object" ? raw.gens : {},
        tiers: raw.tiers && typeof raw.tiers === "object" ? raw.tiers : {},
        seeds: num(raw.seeds, 0),
        harvests: num(raw.harvests, 0),
        caught: raw.caught && typeof raw.caught === "object" ? raw.caught : {},
        rod: Math.min(num(raw.rod, 0), RODS.length - 1),
        autoFisher: !!raw.autoFisher,
        autoFisherOn: raw.autoFisherOn !== false,
        brickLevel: Math.max(1, num(raw.brickLevel, 1)),
        shards: num(raw.shards, 0),
        balls: Math.min(Math.max(1, num(raw.balls, 1)), MAX_BALLS),
        power: Math.max(1, num(raw.power, 1)),
        speed: Math.min(num(raw.speed, 0), MAX_SPEED),
        achievements: Array.isArray(raw.achievements) ? raw.achievements : [],
        upgrades: Array.isArray(raw.upgrades) ? raw.upgrades : [],
        seedUpgrades: Array.isArray(raw.seedUpgrades) ? raw.seedUpgrades : [],
        spentSeeds: num(raw.spentSeeds, 0),
        stats: {
            clicks: num(raw.stats?.clicks, 0),
            butterflies: num(raw.stats?.butterflies, 0),
            bricks: num(raw.stats?.bricks, 0),
            bounties: num(raw.stats?.bounties, 0),
            jumbo: num(raw.stats?.jumbo, 0),
            bought: num(raw.stats?.bought, 0)
        },
        companions: raw.companions && typeof raw.companions === "object" ? raw.companions : {},
        lines: Math.min(Math.max(1, num(raw.lines, 1)), MAX_LINES),
        crit: Math.min(num(raw.crit, 0), MAX_CRIT),
        splash: Math.min(num(raw.splash, 0), MAX_SPLASH),
        magnet: Math.min(num(raw.magnet, 0), MAX_MAGNET),
        auto: Math.min(num(raw.auto, 0), MAX_AUTO),
        bounties: Array.isArray(raw.bounties)
            ? raw.bounties.filter(b => b && BOUNTY_KINDS.some(k => k.kind === b.kind) && typeof b.goal === "number" && typeof b.start === "number")
            : [],
        lastTick: num(raw.lastTick, Date.now())
    } satisfies Save;
}

// Everything that goes into the save file on disk: the game itself plus the toy records.
function snapshot(): DiskSave {
    return { version: 1, savedAt: Date.now(), game: { ...state }, stats: allStats() };
}

export async function save() {
    if (!dirty) return;
    dirty = false;
    await DataStore.set(SAVE_KEY, { ...state });
    scheduleDiskWrite(snapshot);
}

function onVisibility() {
    if (document.visibilityState === "hidden") save();
}

export async function startGame() {
    // The browser copy and the file on disk can drift apart (a wiped profile, a
    // reinstall), so start from whichever was written last.
    const local = await DataStore.get<Partial<Save>>(SAVE_KEY);
    const disk = await readDisk();
    if (disk?.stats) restoreStats(disk.stats);
    const fromDisk = disk?.game && (!local || (disk.game.lastTick ?? 0) > (local.lastTick ?? 0));
    Object.assign(state, sanitize(fromDisk ? disk!.game as Partial<Save> : local));
    if (fromDisk) dirty = true;
    setStatListener(() => scheduleDiskWrite(snapshot));

    const away = Date.now() - state.lastTick;
    if (away > OFFLINE_GAP_MS && cps() > 0) {
        const seconds = Math.min(away, OFFLINE_CAP_MS) / 1000;
        offlineReport = { seconds, coins: cps() * seconds * offlineEfficiency() };
    }

    tickTimer = setInterval(tick, TICK_MS);
    saveTimer = setInterval(save, SAVE_MS);
    document.addEventListener("visibilitychange", onVisibility);
    tick();
}

export async function stopGame() {
    clearInterval(tickTimer);
    clearInterval(saveTimer);
    document.removeEventListener("visibilitychange", onVisibility);
    dirty = true;
    state.lastTick = Date.now();
    setStatListener(undefined);
    await save();
    await flushDiskWrite(snapshot);
}

export async function resetGame() {
    Object.assign(state, freshSave());
    buff = null;
    dirty = true;
    await save();
    emit();
}

const SUFFIXES = ["", "K", "M", "B", "T", "Qa", "Qi", "Sx", "Sp", "Oc", "No", "Dc", "Ud", "Dd", "Td", "Qad", "Qid", "Sxd"];

export function formatNumber(n: number) {
    if (!Number.isFinite(n)) return "0";
    if (n < 1000) return n < 10 && n % 1 ? n.toFixed(1) : Math.floor(n).toString();
    const tier = Math.floor(Math.log10(n) / 3);
    if (tier >= SUFFIXES.length) return n.toExponential(2).replace("e+", "e");
    return parseFloat((n / 1000 ** tier).toFixed(2)) + SUFFIXES[tier];
}

export function formatDuration(seconds: number) {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    if (h) return `${h}h ${m}m`;
    if (m) return `${m}m`;
    return `${Math.floor(seconds)}s`;
}
