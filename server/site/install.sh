#!/usr/bin/env bash
# Discord+ installer for macOS and Linux.
#
# What this does, in order:
#   1. Checks that Git and Node.js 22 or newer are installed (it does not install them for you).
#   2. Installs pnpm with npm if it is missing.
#   3. Downloads Discord+ from https://github.com/rossinskiy/discord-plus into ~/discord-plus,
#      or updates that folder if it is already there.
#   4. Installs the dependencies and builds Discord+.
#   5. Runs "pnpm inject", which asks which Discord to patch.
#
# After that, Discord+ keeps itself up to date: while Discord is open it checks this repository
# every half hour, downloads a new version, builds it and asks you to restart. It only ever
# follows the "release" branch, and it goes back to the working version if a build fails.
#
# It changes nothing outside that folder and Discord's own install. To undo it, run "pnpm uninject"
# inside the folder. Read this file before you run it, that is what it is here for.
#
# This script has not been tested on macOS or Linux yet. If it breaks, please open an issue.
#
# Settings for people who want them:
#   DISCORDPLUS_DIR          install somewhere else than ~/discord-plus
#   DISCORDPLUS_SKIP_INJECT  set to 1 to stop after the build, without touching Discord
#   DISCORDPLUS_ANY_OS       set to 1 to skip the check that this is macOS or Linux (for testing)

set -euo pipefail

REPO="https://github.com/rossinskiy/discord-plus.git"
DIR="${DISCORDPLUS_DIR:-$HOME/discord-plus}"

step() { printf '\n\033[32m==> %s\033[0m\n' "$1"; }
stop() { printf '\n\033[33m%s\033[0m\n' "$1" >&2; exit 1; }

case "$(uname -s)" in
    Linux | Darwin) ;;
    *) [ "${DISCORDPLUS_ANY_OS:-}" = "1" ] || stop "This script is for macOS and Linux. On Windows use the PowerShell command from https://discordplus.karatel.win/install" ;;
esac

step "Checking Git"
command -v git > /dev/null 2>&1 || stop "Git is missing. Install it with your package manager (on macOS run: xcode-select --install), open a new Terminal and run this again."

step "Checking Node.js (22 or newer)"
command -v node > /dev/null 2>&1 || stop "Node.js is missing. Install version 22 or newer from https://nodejs.org, open a new Terminal and run this again."
node -e 'process.exit(Number(process.versions.node.split(".")[0]) >= 22 ? 0 : 1)' \
    || stop "Node.js $(node --version) is too old, Discord+ needs 22 or newer. Update it from https://nodejs.org and run this again."

step "Checking pnpm"
if ! command -v pnpm > /dev/null 2>&1; then
    echo "pnpm is missing, installing it with npm."
    npm install --global pnpm \
        || stop "Could not install pnpm for you, the folder may need extra permission. Install it from https://pnpm.io/installation, open a new Terminal and run this again."
fi

step "Getting Discord+"
if [ -d "$DIR/.git" ]; then
    echo "Found $DIR, updating it."
    git -C "$DIR" pull --ff-only
else
    # Every install follows the release branch, which is where updates are published.
    # It falls back to the default branch if that branch does not exist yet.
    if ! git clone --depth 1 --branch release "$REPO" "$DIR"; then
        echo "No release branch yet, using the default branch."
        git clone --depth 1 "$REPO" "$DIR"
    fi
fi
cd "$DIR"

step "Installing dependencies (this takes a minute)"
pnpm install

step "Building Discord+"
pnpm build

if [ "${DISCORDPLUS_SKIP_INJECT:-}" = "1" ]; then
    printf '\nStopped before adding Discord+ to Discord, as asked.\n'
    exit 0
fi

step "Adding Discord+ to Discord"
echo "Close Discord first. Pick your Discord install when it asks."
echo "If it asks for your password, it is writing into Discord's own folder."
# When this script is piped from curl, the keyboard is not the script's input, so the
# installer is given the terminal directly. Without that it could not ask anything.
if [ -r /dev/tty ]; then
    pnpm inject < /dev/tty
else
    pnpm inject
fi

printf '\n\033[32mDone.\033[0m Start Discord, open Settings, then Plugins, and switch on what you want.\n'
echo "To remove it later: cd \"$DIR\" and run: pnpm uninject"
