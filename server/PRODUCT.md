# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Stack

Existing static HTML, CSS and a little vanilla JavaScript in `server/site/`, served by a small Express app (`server/server.js`) on the author's VPS behind a Cloudflare tunnel. Kept as it is. The site is in English.

## Users

People who already run, or are curious about, a Discord client mod such as Vencord on the Windows desktop app. They are comfortable with settings pages and plugin lists, not always with a terminal. A second group is the author's friends and their Discord servers, who see Discord+ badges and member numbers on profiles and want to know what that is.

## Product Purpose

Discord+ is a free, open-source (GPL-3.0) fork of Vencord for the Discord desktop app. It keeps every Vencord plugin and adds its own: AutoQuest, Idle Lounge, Reminders, LiteMode, MyProfile (own badges and display name, Discord+ badges and member numbers other users can see), a second-account window, and local-only history plugins (MessageArchive, NicknameHistory, LastSeen, UserTags). Success is a visitor installing it and using it, and the project being easy to find and trust.

## Positioning

A Vencord fork with a lot of extra plugins that no other client mod ships, including a small game lounge for idling, profile badges with a visible member number (who joined Discord+ when), and a plugin that makes Discord lighter on CPU, GPU and RAM. All saved data stays on the user's own computer.

## Operating Context

Installed from source with Node.js 22+, pnpm and Git, then injected into Discord with `pnpm inject`. Tested on Windows. Discord must be restarted to load a new build. A one-command Windows installer script is planned as part of this work. The site and the badge/member-number service run on the author's VPS (`discordplus.karatel.win`).

## Capabilities and Constraints

- All Discord+ plugins are off until enabled in Discord's plugin settings.
- All plugin data is stored locally. The only server contact is the optional MyProfile lookup (sends Discord user IDs of people you view, and your own ID once if you join the member list) and the website itself.
- Client mods, Discord+ included, break Discord's terms of service. AutoQuest is the riskiest part (reports of temporary Quest suspensions) and its warning must stay visible.
- Not affiliated with Discord Inc. or the Vencord project. GPL-3.0.
- The site sets no cookies and has no analytics; it stores the theme choice and a dismissed notice in local storage.
- Undecided: a signed Windows installer or `.exe`, macOS and Linux support, any public chat or community server.

## Brand Commitments

Name: Discord+. Green accent (#22c55e) and a plus mark on a dark rounded square (current logo and favicon). Plain, honest voice, no hype and no fake numbers. The README does not list features; the website may.

## Evidence on Hand

Real: the open-source repository (github.com/rossinskiy/discord-plus), the plugin code, the privacy page and terms. Absent and must not be invented: user counts, stars, testimonials, reviews, download numbers, press. Screenshots of the real client do not exist yet; any illustration of a plugin must be drawn and clearly marked as an illustration.

## Product Principles

- Be honest about risk. State the terms-of-service warning plainly and never oversell safety.
- Local first. Data stays on the user's computer; every server contact is named and optional.
- Show real things. Demonstrate what plugins do with drawn illustrations marked as such; no fake social proof.
- Remove friction. Getting from the site to a running Discord+ should take one command.

## Accessibility & Inclusion

Keyboard operable, visible focus, sufficient contrast in both dark and light themes, reduced-motion respected, usable on a phone.
