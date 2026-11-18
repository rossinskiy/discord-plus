/*
 * Vencord, a Discord client mod
 * Copyright (c) 2026 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

// Finds the plugin patches that no longer fit the current Discord build.
//
//   node scripts/checkPatches.mjs          checks the main bundles Discord loads on start
//   node scripts/checkPatches.mjs --all    also downloads the lazy chunks (slow, thousands of files)
//
// It reads every `find` + `replacement.match` pair written as a plain string or regex literal in
// src/plugins, downloads Discord's JavaScript and reports the pairs that match nothing.
// A patch that points at a lazy chunk shows as missing unless you pass --all.

import { mkdirSync, readdirSync, readFileSync, writeFileSync, existsSync } from "fs";
import { tmpdir } from "os";
import { join, relative } from "path";
import ts from "typescript";

const ROOT = new URL("..", import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, "$1");
const ALL = process.argv.includes("--all");
const CACHE = join(tmpdir(), "discord-plus-patch-check");
mkdirSync(CACHE, { recursive: true });

// ---------- read the patches out of the plugin sources ----------

function walk(dir, out = []) {
    for (const entry of readdirSync(dir, { withFileTypes: true })) {
        const p = join(dir, entry.name);
        if (entry.isDirectory()) walk(p, out);
        else if (/\.(ts|tsx)$/.test(entry.name)) out.push(p);
    }
    return out;
}

const propName = p => (p.name && (ts.isIdentifier(p.name) || ts.isStringLiteral(p.name))) ? p.name.text : null;
const prop = (obj, name) => obj.properties.find(p => ts.isPropertyAssignment(p) && propName(p) === name)?.initializer;

// A string or regex literal as { kind, text, flags }, or null when it is computed.
function literal(node) {
    if (!node) return null;
    if (ts.isStringLiteral(node) || ts.isNoSubstitutionTemplateLiteral(node)) return { kind: "string", text: node.text };
    if (ts.isRegularExpressionLiteral(node)) {
        const raw = node.text;
        const end = raw.lastIndexOf("/");
        return { kind: "regex", text: raw.slice(1, end), flags: raw.slice(end + 1) };
    }
    return null;
}

function pluginNameOf(node) {
    for (let n = node.parent; n; n = n.parent) {
        if (ts.isObjectLiteralExpression(n)) {
            const name = prop(n, "name");
            if (name && ts.isStringLiteral(name)) return name.text;
        }
    }
    return "?";
}

const patches = [];
for (const file of walk(join(ROOT, "src", "plugins"))) {
    const sf = ts.createSourceFile(file, readFileSync(file, "utf8"), ts.ScriptTarget.Latest, true);
    const visit = node => {
        if (ts.isObjectLiteralExpression(node)) {
            const find = literal(prop(node, "find"));
            const repl = prop(node, "replacement");
            if (find && repl) {
                const list = ts.isArrayLiteralExpression(repl) ? repl.elements : [repl];
                for (const r of list) {
                    if (!ts.isObjectLiteralExpression(r)) continue;
                    const match = literal(prop(r, "match"));
                    patches.push({ plugin: pluginNameOf(node), file: relative(ROOT, file), find, match });
                }
            }
        }
        ts.forEachChild(node, visit);
    };
    visit(sf);
}

// ---------- download Discord ----------

const UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0 Safari/537.36";

async function get(url) {
    const res = await fetch(url, { headers: { "user-agent": UA } });
    if (!res.ok) throw new Error(`${res.status} ${url}`);
    return res.text();
}

async function cached(name, url) {
    const file = join(CACHE, name);
    if (existsSync(file)) return readFileSync(file, "utf8");
    const text = await get(url);
    writeFileSync(file, text);
    return text;
}

const html = await get("https://discord.com/app");
const scripts = [...new Set([...html.matchAll(/\/assets\/([\w.-]+\.js)/g)].map(m => m[1]))];
if (!scripts.length) throw new Error("Could not find Discord's scripts on /app");
console.log(`Discord bundles: ${scripts.length} files, entry ${scripts.find(n => n.startsWith("web.")) ?? "?"}`);

const texts = [];
for (const name of scripts) texts.push(await cached(name, `https://discord.com/assets/${name}`));

if (ALL) {
    // Lazy chunks are named by a 16 character hash that appears in the entry bundle's chunk map.
    const ids = new Set();
    for (const t of texts) for (const m of t.matchAll(/"([0-9a-f]{16})"/g)) ids.add(m[1]);
    console.log(`Downloading ${ids.size} lazy chunks, this takes a few minutes...`);
    const queue = [...ids];
    const worker = async () => {
        for (let id; (id = queue.pop());) {
            try { texts.push(await cached(id + ".js", `https://discord.com/assets/${id}.js`)); } catch { /* not a chunk */ }
        }
    };
    await Promise.all(Array.from({ length: 16 }, worker));
}

// ---------- check ----------

const IDENT = "[A-Za-z_$][\\w$]*";
const toRegex = m => m.kind === "string"
    ? null
    : new RegExp(m.text.replaceAll("\\i", IDENT), m.flags.replace(/[gy]/g, ""));

const bad = [];
let ok = 0;
let skipped = 0;
for (const p of patches) {
    // Discord's translated strings are written as #{intl::KEY} and are hashed by Vencord's build, so they cannot be checked here.
    if (p.find.text.includes("#{intl::") || p.match?.text.includes("#{intl::")) { skipped++; continue; }
    const findStr = p.find.kind === "string" ? p.find : null;
    const findRe = p.find.kind === "regex" ? toRegex(p.find) : null;
    const hits = texts.filter(t => findStr ? t.includes(findStr.text) : findRe.test(t));
    if (!hits.length) { bad.push({ ...p, why: "find matches nothing" }); continue; }
    if (!p.match) { ok++; continue; }
    const re = toRegex(p.match);
    const works = hits.some(t => re ? re.test(t) : t.includes(p.match.text));
    if (works) ok++; else bad.push({ ...p, why: "find is there but match is not" });
}

console.log(`\n${patches.length} patches read, ${ok} fit, ${bad.length} do not.`);
for (const b of bad) {
    const f = b.find.kind === "string" ? JSON.stringify(b.find.text) : `/${b.find.text}/`;
    const m = b.match ? (b.match.kind === "string" ? JSON.stringify(b.match.text) : `/${b.match.text}/`) : "-";
    console.log(`\n${b.plugin} (${b.file})\n  ${b.why}\n  find:  ${f.slice(0, 120)}\n  match: ${m.slice(0, 160)}`);
}
if (bad.length && !ALL) console.log("\nA patch for a lazy chunk shows up here too. Run again with --all to include those.");
process.exit(bad.length ? 1 : 0);
