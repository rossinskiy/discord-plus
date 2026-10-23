# Discord+ installer for Windows.
#
# What this does, in order:
#   1. Checks that Git and Node.js 22 or newer are installed (it does not install them for you).
#   2. Installs pnpm with npm if it is missing.
#   3. Downloads Discord+ from https://github.com/rossinskiy/discord-plus into %USERPROFILE%\discord-plus,
#      or updates that folder if it is already there.
#   4. Installs the dependencies and builds Discord+.
#   5. Runs "pnpm inject", which asks which Discord to patch.
#
# It changes nothing outside that folder and Discord's own install. To undo it, run "pnpm uninject"
# inside the folder. Read this file before you run it, that is what it is here for.

$ErrorActionPreference = "Stop"

$repo = "https://github.com/rossinskiy/discord-plus.git"
$dir = Join-Path $env:USERPROFILE "discord-plus"

function Step($text) {
    Write-Host ""
    Write-Host "==> $text" -ForegroundColor Green
}

function Stop-With($text) {
    Write-Host ""
    Write-Host $text -ForegroundColor Yellow
    exit 1
}

# Runs a program and stops the script when it fails.
function Run {
    param([string]$File, [string[]]$Arguments)
    & $File @Arguments
    if ($LASTEXITCODE -ne 0) {
        Stop-With "$File failed with exit code $LASTEXITCODE. Scroll up to see why."
    }
}

Step "Checking Git"
if (-not (Get-Command git -ErrorAction SilentlyContinue)) {
    Stop-With "Git is missing. Install it from https://git-scm.com/download/win, open a new PowerShell window and run this again."
}

Step "Checking Node.js (22 or newer)"
if (-not (Get-Command node -ErrorAction SilentlyContinue)) {
    Stop-With "Node.js is missing. Install version 22 or newer from https://nodejs.org, open a new PowerShell window and run this again."
}
$nodeVersion = [version](((& node --version) -replace "^v", "") -replace "-.*$", "")
if ($nodeVersion.Major -lt 22) {
    Stop-With "Node.js $nodeVersion is too old, Discord+ needs 22 or newer. Update it from https://nodejs.org and run this again."
}

Step "Checking pnpm"
if (-not (Get-Command pnpm -ErrorAction SilentlyContinue)) {
    Write-Host "pnpm is missing, installing it with npm."
    Run "npm" @("install", "--global", "pnpm")
    # npm puts global programs in a folder this window may not know about yet.
    $env:Path = "$env:Path;$(& npm prefix --global)"
}

Step "Getting Discord+"
if (Test-Path (Join-Path $dir ".git")) {
    Write-Host "Found $dir, updating it."
    Run "git" @("-C", $dir, "pull", "--ff-only")
} else {
    Run "git" @("clone", "--depth", "1", $repo, $dir)
}
Set-Location $dir

Step "Installing dependencies (this takes a minute)"
Run "pnpm" @("install")

Step "Building Discord+"
Run "pnpm" @("build")

Step "Adding Discord+ to Discord"
Write-Host "Close Discord first if it is open. Pick your Discord install when it asks."
Run "pnpm" @("inject")

Write-Host ""
Write-Host "Done. Start Discord, open Settings, then Plugins, and switch on what you want." -ForegroundColor Green
Write-Host "To remove it later: open PowerShell in $dir and run: pnpm uninject"
