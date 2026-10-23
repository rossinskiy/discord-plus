# Discord+

Discord+ is a desktop Discord client mod with its own plugins, built on the Vencord plugin framework. Install it and look through the plugin list in Discord's settings to see what it adds.

Website, plugin list and one-command install: [discordplus.karatel.win](https://discordplus.karatel.win).

It is a fork of [Vencord](https://github.com/Vendicated/Vencord) and is licensed under GPL-3.0, the same license as Vencord. See [Credits and license](#credits-and-license).

## Installing

Discord+ is installed from source. You need Node.js, [pnpm](https://pnpm.io) and Git.

```bash
git clone https://github.com/rossinskiy/discord-plus.git
cd discord-plus
pnpm install
pnpm build
pnpm inject
```

`pnpm inject` runs the installer and points your Discord at this folder. Restart Discord afterwards. After changing code, run `pnpm build` and restart Discord, or press `Ctrl+R` if the change only touched renderer code. Changes to the main process need a full restart.

Do not use the installers on vencord.dev for this. They install stock Vencord, not Discord+.

## Warning about AutoQuest

Automating Quests goes against Discord's terms of service. Reports from other users describe temporary Quest access suspensions for what Discord calls inauthentic quest completion, so there is a real risk to your account. AutoQuest does not get past captchas and only touches Quests you accepted yourself. Use it on an account you can afford to lose, or leave it off.

More generally, any client mod is against Discord's terms. You use Discord+ at your own risk.

## How it was built

Discord+ is vibe-coded. The custom plugins, the multi-account window and the backend were written with an AI coding assistant (Claude Code), directed and tested by the author. Expect rough edges, and read the code before you trust it with anything important. Bug reports and pull requests are welcome.

## Credits and license

Discord+ is based on [Vencord](https://github.com/Vendicated/Vencord) by Vendicated and contributors, and keeps its copyright notices. Vencord's own plugins and framework are theirs. The custom plugins, the multi-account window and the backend in this repository are written for Discord+.

Discord+ is free software under the [GNU General Public License v3.0](LICENSE). It is not affiliated with or endorsed by Discord Inc. or the Vencord project.
