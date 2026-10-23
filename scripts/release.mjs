/*
 * Discord+ release script.
 *
 * Every Discord+ install follows the `release` branch of this repository and updates itself from
 * it, so pushing to `release` is how an update reaches everyone. This script checks that what you
 * are about to ship type-checks and builds, then pushes the current commit there.
 *
 *   pnpm release            check, then push HEAD to the release branch
 *   pnpm release --dry-run  only check, push nothing
 */

import { execFileSync } from "child_process";

const dryRun = process.argv.includes("--dry-run");
const run = (cmd, args, opts = {}) => execFileSync(cmd, args, { stdio: "inherit", shell: process.platform === "win32" && cmd !== "git", ...opts });
const out = (cmd, args) => execFileSync(cmd, args, { encoding: "utf-8" }).trim();

function fail(message) {
    console.error(`\nNot released: ${message}`);
    process.exit(1);
}

const branch = out("git", ["branch", "--show-current"]);
if (branch !== "main") fail(`you are on "${branch}". Release from main.`);

if (out("git", ["status", "--porcelain"])) fail("there are uncommitted changes. Commit them first, an update only ships what is committed.");

run("git", ["fetch", "origin"]);
const ahead = out("git", ["rev-list", "--count", "origin/main..HEAD"]);
if (ahead !== "0") fail(`main has ${ahead} commit(s) that are not pushed. Run "git push origin main" first.`);

console.log("\nChecking types...");
run("npx", ["tsc", "--noEmit", "-p", "."]);

console.log("\nBuilding...");
run("node", ["--require=./scripts/suppressExperimentalWarnings.js", "scripts/build/build.mjs"]);

const commit = out("git", ["log", "-1", "--format=%h %s"]);
if (dryRun) {
    console.log(`\nAll checks passed. Would release: ${commit}`);
    process.exit(0);
}

console.log(`\nReleasing ${commit}`);
// No force: if release has something main does not, this stops instead of overwriting it.
run("git", ["push", "origin", "HEAD:release"]);
console.log("\nDone. Everyone's Discord+ picks this up within about half an hour of being open.");
