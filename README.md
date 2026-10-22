# Discord+

Discord+ is a desktop Discord client mod built for people who want Discord to remember things and run chores for them. It adds a set of its own plugins and a second-account window on top of the Vencord plugin framework.

It is a fork of [Vencord](https://github.com/Vendicated/Vencord) and is licensed under GPL-3.0, the same license as Vencord. See [Credits and license](#credits-and-license).

## What Discord+ adds

**Two accounts at once.** Press `Ctrl+Shift+2` while a Discord+ window is focused to switch between your main account and a second one. The second account runs in its own window with its own login, and both stay connected, so messages and notifications arrive on both. Only one window is visible at a time, and the second one does not show up in Alt+Tab. The shortcut works only inside Discord, never system-wide.

**Plugins made for Discord+:**

| Plugin | What it does |
| --- | --- |
| MessageArchive | Saves edited and deleted messages locally on your own computer and shows them in chat like MessageLogger does. Old entries are removed after 7 days, or on demand from the plugin settings. Replaces MessageLogger. |
| NicknameHistory | Records changes to usernames, display names and per-server nicknames, so you can see what someone used to be called. Stored locally. |
| LastSeen | Remembers when someone was last seen online, was typing, or sent a message, and why that reading was made. It only knows what your own client saw, and it is not a read receipt. Stored locally. |
| BulkExport | Exports the full history of a channel or DM to a JSON file. |
| AutoLeaveEmptyVC | Disconnects you from a voice channel once you are the only human left, after a delay you choose. |
| AutoQuest | Completes the Discord Quests you have accepted in the background and tries to claim the reward. See the warning below. |
| UserTags | Lets you give any person your own tags and a private note, shows the tags next to their name in chat, and lets you filter everyone you have tagged. Stored locally. |
| LiteMode | Makes Discord lighter on CPU, GPU and RAM: cuts animations and blur and swaps animated avatars, emoji and banners for still images. Each part has its own switch. Cannot run together with AlwaysAnimate. |
| Reminders | Right-click a message (or use `/remind in: about:`) to get a notification later, with a jump straight back to it. Stored locally and survives a client restart. |

Every Vencord plugin still works alongside these.

## Local-only data

MessageArchive, NicknameHistory, LastSeen and UserTags keep all of their data on your own computer (in the client's local IndexedDB storage), never on any server. Nothing is sent anywhere else, there is nothing to self-host, and no token or server URL to configure.

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
