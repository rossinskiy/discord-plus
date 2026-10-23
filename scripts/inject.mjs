/*
 * Discord+, a modification for Discord's desktop app
 * Copyright (c) 2026 Discord+ contributors
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
 *
 * The way Discord is patched (move app.asar to _app.asar, put a tiny app.asar
 * that loads dist/patcher.js in its place) and the asar layout written below
 * follow the Vencord Installer (https://github.com/Vencord/Installer, GPL-3.0).
*/

import "./checkNodeVersion.js";

import { execFileSync } from "child_process";
import { existsSync, readdirSync, renameSync, rmSync, writeFileSync } from "fs";
import { homedir, platform } from "os";
import { basename, dirname, join, resolve } from "path";
import { createInterface } from "readline";
import { fileURLToPath } from "url";

const BASE_DIR = join(dirname(fileURLToPath(import.meta.url)), "..");
const PATCHER = join(BASE_DIR, "dist", "patcher.js");
const HOME = process.env.SUDO_USER && process.env.HOME === "/root" ? `/home/${process.env.SUDO_USER}` : homedir();

const args = process.argv.slice(2);
const action = args.includes("--uninstall") ? "uninstall" : "install";
const flag = name => {
    const i = args.indexOf(name);
    return i === -1 ? null : args[i + 1] ?? null;
};
const customPath = flag("--location");

const log = (...a) => console.log(...a);
const fail = msg => { console.error("\n" + msg); process.exit(1); };

// ---------- asar ----------

function buildAppAsar(patcherPath) {
    const indexJs = Buffer.from("require(" + JSON.stringify(patcherPath) + ")");
    const packageJson = Buffer.from(JSON.stringify({ name: "discord", main: "index.js" }));
    const header = JSON.stringify({
        files: {
            "index.js": { size: indexJs.length, offset: "0" },
            "package.json": { size: packageJson.length, offset: String(indexJs.length) }
        }
    });
    const headerLen = Buffer.byteLength(header);
    const aligned = (headerLen + 3) & ~3;
    const out = Buffer.alloc(16);
    out.writeInt32LE(4, 0);
    out.writeInt32LE(aligned + 8, 4);
    out.writeInt32LE(aligned + 4, 8);
    out.writeInt32LE(headerLen, 12);
    return Buffer.concat([out, Buffer.from(header + "0".repeat(aligned - headerLen)), indexJs, packageJson]);
}

// ---------- finding Discord ----------

const isValid = resources => existsSync(join(resources, "app.asar")) || existsSync(join(resources, "_app.asar"));
const isPatched = resources => existsSync(join(resources, "_app.asar"));

function newestAppResources(dir) {
    let best = null;
    let entries;
    try { entries = readdirSync(dir, { withFileTypes: true }); } catch { return null; }
    for (const e of entries) {
        if (!e.isDirectory() || !e.name.startsWith("app-")) continue;
        const res = join(dir, e.name, "resources");
        if (isValid(res) && (best === null || res > best)) best = res;
    }
    return best;
}

function branchOf(name) {
    const n = name.toLowerCase();
    if (n.includes("canary")) return "Canary";
    if (n.includes("ptb")) return "PTB";
    if (n.includes("development") || n.endsWith("dev")) return "Development";
    return "Stable";
}

function found(label, resources, flatpak = null) {
    return { label, resources, patched: isPatched(resources), flatpak };
}

function findAll() {
    const out = [];
    const seen = new Set();
    const add = d => { if (d && !seen.has(d.resources)) { seen.add(d.resources); out.push(d); } };
    const os = platform();

    if (os === "win32") {
        const base = process.env.LOCALAPPDATA;
        for (const name of ["Discord", "DiscordPTB", "DiscordCanary", "DiscordDevelopment"]) {
            const res = base && newestAppResources(join(base, name));
            if (res) add(found(branchOf(name) + " (" + join(base, name) + ")", res));
        }
    } else if (os === "darwin") {
        for (const base of ["/Applications", join(HOME, "Applications")]) {
            for (const name of ["Discord", "Discord PTB", "Discord Canary", "Discord Development"]) {
                const res = join(base, name + ".app", "Contents", "Resources");
                if (isValid(res)) add(found(branchOf(name) + " (" + join(base, name + ".app") + ")", res));
            }
        }
    } else {
        const names = ["Discord", "DiscordPTB", "DiscordCanary", "DiscordDevelopment", "discord", "discordptb", "discordcanary", "discorddevelopment", "discord-ptb", "discord-canary", "discord-development"];
        // Classic installs: the folder holds a "resources" folder directly.
        for (const base of ["/usr/share", "/usr/lib64", "/usr/lib", "/opt", join(HOME, ".local/share"), join(HOME, ".dvm")]) {
            for (const name of names) {
                const res = join(base, name, "resources");
                if (isValid(res)) add(found(branchOf(name) + " (" + join(base, name) + ")", res));
            }
        }
        // Flatpak.
        for (const base of ["/var/lib/flatpak/app", join(HOME, ".local/share/flatpak/app")]) {
            for (const name of ["Discord", "DiscordPTB", "DiscordCanary"]) {
                const app = "com.discordapp." + name;
                const inner = name === "Discord" ? "discord" : name.replace("Discord", "discord-").toLowerCase();
                const res = join(base, app, "current/active/files", inner, "resources");
                if (isValid(res)) add(found(branchOf(name) + " (Flatpak)", res, { app, user: !base.startsWith("/var") }));
            }
        }
        // Discord from a distribution package (Arch among them) downloads itself into the home folder.
        for (const name of ["discord", "discordptb", "discordcanary"]) {
            const dir = join(HOME, ".config", name);
            const res = newestAppResources(dir);
            if (res) add(found(branchOf(name) + " (" + dir + ")", res));
        }
        for (const name of ["Discord", "DiscordPTB", "DiscordCanary"]) {
            const dir = join(HOME, ".var/app", "com.discordapp." + name, "config/discord");
            const res = newestAppResources(dir);
            if (res) add(found(branchOf(name) + " (Flatpak, " + dir + ")", res, { app: "com.discordapp." + name, user: true }));
        }
    }
    return out;
}

// Accepts whatever the person has at hand: the Discord folder, the folder that
// contains the app-* folders, an app-* folder, a resources folder or a macOS .app.
function resolveCustom(input) {
    const p = resolve(input.trim().replace(/^~(?=$|[\\/])/, HOME));
    const candidates = [p, join(p, "resources"), join(p, "Contents", "Resources")];
    for (const c of candidates) if (isValid(c)) return found("Custom (" + p + ")", c);
    const viaApp = newestAppResources(p);
    if (viaApp) return found("Custom (" + p + ")", viaApp);
    return null;
}

// ---------- patching ----------

function busyHint(err) {
    if (err.code === "EBUSY" || err.code === "EPERM" || err.code === "EACCES") {
        return err.message + "\nClose Discord completely (also from the tray) and try again."
            + (platform() === "win32" ? "" : " If it says permission denied, the folder belongs to root: run the same command with sudo.");
    }
    return err.message;
}

function patch(d) {
    const dir = d.resources;
    const app = join(dir, "app.asar");
    const backup = join(dir, "_app.asar");
    if (!existsSync(PATCHER)) fail("dist/patcher.js is missing. Run: pnpm build");

    if (d.patched) {
        // Already patched: just point it at this copy of Discord+ again.
        writeFileSync(app, buildAppAsar(PATCHER));
        return;
    }
    renameSync(app, backup);
    try {
        writeFileSync(app, buildAppAsar(PATCHER));
    } catch (err) {
        renameSync(backup, app);
        throw err;
    }
}

function unpatch(d) {
    const dir = d.resources;
    const app = join(dir, "app.asar");
    const backup = join(dir, "_app.asar");
    if (!existsSync(backup)) return false;
    rmSync(app, { force: true });
    renameSync(backup, app);
    return true;
}

function grantFlatpak(fp) {
    if (!fp) return;
    const a = [...(fp.user ? ["--user"] : []), "override", fp.app, "--filesystem=" + dirname(PATCHER)];
    log("Giving the Flatpak access to the Discord+ folder: flatpak " + a.join(" "));
    try { execFileSync("flatpak", a, { stdio: "inherit" }); } catch {
        console.warn("Could not run flatpak. Run that command by hand, or Discord+ will not load.");
    }
}

// ---------- ui ----------

function ask(question) {
    const rl = createInterface({ input: process.stdin, output: process.stdout });
    return new Promise(res => rl.question(question, a => { rl.close(); res(a); }));
}

async function choose(list) {
    if (list.length === 1) {
        log("Found: " + list[0].label);
        return list[0];
    }
    list.forEach((d, i) => log(`  ${i + 1}. ${d.label}${d.patched ? "  [Discord+ already added]" : ""}`));
    for (;;) {
        const n = Number(await ask("Which one? Type a number: "));
        if (list[n - 1]) return list[n - 1];
    }
}

async function main() {
    if (process.getuid?.() === 0 && !process.env.SUDO_USER) {
        fail("Do not run this as root. Run it as your normal user, and add sudo only if it says permission denied.");
    }

    let list;
    if (customPath) {
        const d = resolveCustom(customPath);
        if (!d) fail("No Discord found in " + customPath + ". Give the folder that contains the app-... folders, or the one that contains resources.");
        list = [d];
    } else {
        list = findAll();
        if (action === "uninstall") list = list.filter(d => d.patched);
    }

    if (list.length === 0) {
        log(action === "uninstall" ? "No Discord with Discord+ was found." : "No Discord install was found automatically.");
        if (!process.stdin.isTTY && !existsSync("/dev/tty")) fail("Pass the folder yourself: pnpm inject -- --location <folder>");
        for (;;) {
            const a = (await ask("Type the folder where Discord is installed (or press Enter to quit): ")).trim();
            if (!a) process.exit(1);
            const d = resolveCustom(a);
            if (d) { list = [d]; break; }
            log("That folder has no Discord in it. Try the folder that contains the app-... folders, for example ~/.config/discord");
        }
    }

    const target = await choose(list);
    try {
        if (action === "install") {
            patch(target);
            grantFlatpak(target.flatpak);
            log(`\nDiscord+ is now in ${basename(dirname(target.resources))}. Start Discord, open Settings, then Plugins.`);
        } else {
            log(unpatch(target) ? "\nDiscord+ removed. Discord is back to normal." : "\nThat Discord had no Discord+ in it.");
        }
    } catch (err) {
        fail(busyHint(err));
    }
}

main();
