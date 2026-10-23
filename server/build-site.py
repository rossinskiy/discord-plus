"""Builds the static pages in server/site from one place, so the header and footer never drift apart.

Run:  python server/build-site.py
The text of the privacy and terms pages lives in server/content/. If server/donate.json lists
wallets, a Support page and its links are built too, otherwise there is none.
"""

import html as H
import os
import re

HERE = os.path.dirname(os.path.abspath(__file__))
SITE = os.path.join(HERE, "site")
ORIGIN = "https://discordplus.karatel.win"
GITHUB = "https://github.com/rossinskiy/discord-plus"
CMD = "irm https://discordplus.karatel.win/install.ps1 | iex"
CMD_UNIX = "curl -fsSL https://discordplus.karatel.win/install.sh | bash"

e = H.escape

import hashlib


def ver(name):
    with open(os.path.join(SITE, "assets", name), "rb") as f:
        return hashlib.sha256(f.read()).hexdigest()[:8]


V = {n: ver(n) for n in ("style.css", "app.js", "theme.js", "favicon.svg")}

# ------------------------------------------------------------------ plugin facts
PLUGINS = [
    dict(id="autoquest", name="AutoQuest", group="Tools", tags="[risk]",
         short="Finishes the Discord Quests you have accepted and tries to claim the reward.",
         body="For video Quests it reports your progress, for game Quests it tells Discord a game is running, and for activity Quests it keeps the session alive. It paces itself like a person and finishes when the Quest is due, not later.",
         points=["Only works on Quests you accepted yourself.",
                 "It does not solve captchas.",
                 "Other users report temporary Quest suspensions for what Discord calls inauthentic quest completion. Use an account you can afford to lose, or leave it off."],
         facts=[("Saves data", "nothing"), ("Discord+ server", "none"), ("Risk", "high, breaks Discord's rules")], risk=True),
    dict(id="idle-lounge", name="Idle Lounge", group="Fun", tags="[local file]",
         short="A lounge inside Discord for when you want to do nothing.",
         body="An idle garden that keeps earning while you chat, fishing with a collection of 30 fish, a brick game that plays itself, a fidget board, knife flipping, running in circles, rooftop parkour, and eight calm scenes such as an aquarium, a fireplace and a rainy window.",
         points=["Open it from the button in the chat bar or with the /lounge command.",
                 "Progress is saved in a file on your PC, so it survives a reinstall.",
                 "It is all just games. Nothing in it is sent anywhere."],
         facts=[("Saves data", "a file on your PC"), ("Discord+ server", "none"), ("Risk", "none")]),
    dict(id="my-profile", name="MyProfile", group="Appearance", tags="[optional lookup]",
         short="Your own badges and display name, and Discord+ badges on other people.",
         body="Give yourself badges and a display name that only you see, even ones that look like Discord's own. Discord+ users also get a member number: the lower it is, the earlier they joined. Others with Discord+ see it as a badge on the profile.",
         points=["The Discord+ badges (Dev, Tester, Supporter, Founder, Bug Hunter, Artist) are handed out by the Discord+ team. You cannot give them to yourself.",
                 "To show badges it asks the Discord+ server about people whose profiles you look at, which sends their user IDs. You can turn that off in the plugin settings.",
                 "Joining the member list sends your own user ID once. That is a setting too, and it is on by default once you enable the plugin.",
                 "Your own badges and display name never leave your PC."],
         facts=[("Saves data", "your PC"), ("Discord+ server", "optional lookups, they send user IDs"), ("Risk", "none")]),
    dict(id="lite-mode", name="LiteMode", group="Appearance", tags="[local]",
         short="Makes Discord lighter on CPU, GPU and RAM.",
         body="Turns off animations and the blur behind menus, stops elements from reserving GPU layers, and shows still images instead of animated avatars, emoji, banners and name effects. Typing feels less laggy on slower PCs.",
         points=["Every part has its own switch in the plugin settings.",
                 "It cannot be on together with AlwaysAnimate, because they do opposite things to the same code."],
         facts=[("Saves data", "settings only"), ("Discord+ server", "none"), ("Risk", "none")]),
    dict(id="reminders", name="Reminders", group="Tools", tags="[local]",
         short="Remind yourself about a message or anything else.",
         body="Right-click a message and choose Remind Me About This, or use the /remind command with a time like 10m, 2h30m or 1d. When it fires you get a notification with a chime, and a click takes you back to the message.",
         points=["Reminders survive a restart.",
                 "The plugin settings list your upcoming reminders and let you cancel them."],
         facts=[("Saves data", "your PC"), ("Discord+ server", "none"), ("Risk", "none")]),
    dict(id="message-archive", name="MessageArchive", group="Chat history", tags="[local]",
         short="Keeps edited and deleted messages visible in chat.",
         body="Deleted messages stay in chat, marked as deleted, and clicking (edited) opens the old versions. Everything is saved on your own PC for 7 days.",
         points=["It replaces MessageLogger, so you cannot run both.",
                 "It only knows what your client saw while it was running.",
                 "A button in the plugin settings clears it all at once."],
         facts=[("Saves data", "your PC, 7 days"), ("Discord+ server", "none"), ("Risk", "none")]),
    dict(id="nickname-history", name="NicknameHistory", group="Chat history", tags="[local]",
         short="Records name changes over time.",
         body="Tracks usernames, display names and per-server nicknames. Right-click a person and choose View Name History.",
         points=["Works for global display names too, not only server nicknames.",
                 "Only changes your client saw are recorded, starting from when you switch it on."],
         facts=[("Saves data", "your PC"), ("Discord+ server", "none"), ("Risk", "none")]),
    dict(id="last-seen", name="LastSeen", group="Chat history", tags="[local]",
         short="Remembers when someone was last seen, and what showed it.",
         body="Right-click a person and choose Last Seen. It logs when they went offline, idle or do not disturb, each message they sent and when they started typing.",
         points=["This is not a read receipt. Discord does not give clients that, so LastSeen only knows what your own client saw.",
                 "Someone in invisible mode looks the same as offline."],
         facts=[("Saves data", "your PC"), ("Discord+ server", "none"), ("Risk", "none")]),
    dict(id="user-tags", name="UserTags", group="Chat history", tags="[local]",
         short="Your own tags and a private note on anyone.",
         body="Right-click a person and choose Tags and Notes. Tags show next to their name in chat, and hovering one shows your note. The settings have a list of everyone you tagged, with a filter by tag.",
         points=["Separate from Discord's built-in notes, which stay as they are.",
                 "Nobody else can see your tags or notes."],
         facts=[("Saves data", "your PC"), ("Discord+ server", "none"), ("Risk", "none")]),
    dict(id="bulk-export", name="BulkExport", group="Tools", tags="[local]",
         short="Exports a channel or DM to a JSON file.",
         body="Saves the full message history of a channel or conversation as one JSON file you can keep, search or process.",
         points=["Works from the right-click menu of a channel or conversation."],
         facts=[("Saves data", "a file you choose"), ("Discord+ server", "none"), ("Risk", "none")]),
    dict(id="auto-leave-vc", name="AutoLeaveEmptyVC", group="Tools", tags="[local]",
         short="Leaves a voice channel when you are the only one there.",
         body="Disconnects you from a voice channel after you have been the only person left for a while. The wait is 30 seconds by default and you can change it.",
         points=["Handy when you forget to leave a call."],
         facts=[("Saves data", "settings only"), ("Discord+ server", "none"), ("Risk", "none")]),
    dict(id="second-account", name="Second account window", group="Built in", tags="[built in]",
         short="Flip between two Discord accounts with one shortcut.",
         body="Press Ctrl+Shift+2 while a Discord window is focused. The second account runs in its own window with a separate login, and both stay connected, so messages and notifications arrive on both.",
         points=["There is nothing to switch on, it is part of Discord+.",
                 "Only one window is visible at a time, and the second one does not appear in Alt+Tab.",
                 "The shortcut only works while a Discord+ window is focused. It is never a system-wide hotkey.",
                 "Closing the second window hides it instead of closing it."],
         facts=[("Saves data", "a separate login on your PC"), ("Discord+ server", "none"), ("Risk", "none")]),
]
BY_ID = {p["id"]: p for p in PLUGINS}

HOME_ROWS = ["autoquest", "idle-lounge", "my-profile", "lite-mode", "reminders", "message-archive", "second-account"]

# ------------------------------------------------------------------ shared pieces
LOGO = ('<svg viewBox="0 0 32 32" aria-hidden="true"><rect width="32" height="32" fill="#0000aa"/>'
        '<path d="M16 7v18M7 16h18" stroke="#55ff55" stroke-width="4" stroke-linecap="square" fill="none"/></svg>')

import json

DONATE_FILE = os.path.join(HERE, "donate.json")
WALLETS = []
SERVICES = []
if os.path.exists(DONATE_FILE):
    _donate = json.load(open(DONATE_FILE, encoding="utf-8"))
    WALLETS = [w for w in _donate.get("wallets", []) if w.get("address")]
    SERVICES = [x for x in _donate.get("services", []) if x.get("url")]
HAS_SUPPORT = bool(WALLETS or SERVICES)

NAV = [("/", "Main", "home"), ("/plugins", "Plugins", "plugins"), ("/install", "Install", "install")]
if HAS_SUPPORT:
    NAV.append(("/support", "Support", "support"))


def head(title, desc, path, extra=""):
    url = ORIGIN + path
    return f'''<!doctype html>
<html lang="en" class="no-js">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>{e(title)}</title>
<meta name="description" content="{e(desc)}">
<meta name="theme-color" content="#0000aa">
<link rel="canonical" href="{url}">
<link rel="icon" href="/assets/favicon.svg?v={V["favicon.svg"]}" type="image/svg+xml">
<meta property="og:type" content="website">
<meta property="og:site_name" content="Discord+">
<meta property="og:title" content="{e(title)}">
<meta property="og:description" content="{e(desc)}">
<meta property="og:url" content="{url}">
<meta property="og:image" content="{ORIGIN}/assets/og.png">
<meta property="og:image:width" content="1200">
<meta property="og:image:height" content="630">
<meta name="twitter:card" content="summary_large_image">
<link rel="preload" href="/assets/fonts/vt323.woff2" as="font" type="font/woff2" crossorigin>
<link rel="stylesheet" href="/assets/style.css?v={V["style.css"]}">
<script src="/assets/theme.js?v={V["theme.js"]}"></script>
<script src="/assets/app.js?v={V["app.js"]}" defer></script>
{extra}</head>
<body>
'''


def top(active):
    cur = ' aria-current="page"'
    links = "".join(f'<a href="{h}"{cur if k == active else ""}>{n}</a>' for h, n, k in NAV)
    return f'''<a class="skip" href="#main">Skip to content</a>
<header class="top">
<div class="wrap">
<a class="brand" href="/" aria-label="Discord+ home">{LOGO}<span>Discord+ Setup Utility</span></a>
<nav id="tabs" class="tabs" aria-label="Main">{links}<a href="{GITHUB}" rel="noopener">Source</a><button class="tool" id="theme" type="button" aria-label="Switch between dark and light theme">Theme: Dark</button></nav>
<button class="tool menu-btn" id="menu" type="button" aria-expanded="false" aria-controls="tabs">Menu</button>
</div>
</header>
<div class="progress" aria-hidden="true"><i></i></div>
'''


def bottom(hints):
    keys = "".join(f"<span>{h}</span>" for h in hints)
    support_link = '<a href="/support">Support the project</a>\n' if HAS_SUPPORT else ""
    return f'''<footer>
<div class="notice" id="notice" role="region" aria-label="Notice">
<p>No cookies, no analytics. Only your theme choice is saved, in this browser. <a href="/privacy">Details</a></p>
<button class="btn" type="button">Got it</button>
</div>
<div class="wrap foot">
<div class="links">
<a href="/privacy">Privacy</a>
<a href="/terms">Terms</a>
{support_link}<a href="{GITHUB}" rel="noopener">Source on GitHub</a>
<a href="{GITHUB}/issues" rel="noopener">Report a problem</a>
<a href="{GITHUB}/blob/main/LICENSE" rel="noopener">GPL-3.0 license</a>
<a href="https://github.com/Vendicated/Vencord" rel="noopener">Vencord</a>
</div>
<p>Discord+ is a free, open-source fork of Vencord for the Discord desktop app. It is not affiliated with Discord Inc. or the Vencord project.</p>
<p>&copy; <span data-year>2026</span> Discord+. Released under the GNU General Public License v3.0.</p>
</div>
</footer>
<div class="dock">
<div class="keys"><div class="wrap">{keys}</div></div>
</div>
<button class="btn to-top" type="button" aria-label="Back to the top">Top</button>
</body>
</html>
'''


def cmd_box(text, copy_id=None, label="Copy", prompt="PS&gt; "):
    lines = text.split("\n")
    out = []
    for n, line in enumerate(lines):
        parts = line.split(" | ")
        pieces = []
        for k, part in enumerate(parts):
            pieces.append('<span class="seg">' + ("| " if k else "") + e(part).replace("karatel.win/", "karatel.win/<wbr>") + "</span>")
        lead = f'<span class="prompt">{prompt}</span>' if n == 0 else ('<span class="prompt">    </span>' if prompt else "")
        out.append(lead + " ".join(pieces))
    idattr = f' id="{copy_id}"' if copy_id else ""
    return '<div class="cmd"><code>' + "\n".join(out) + '</code><button class="btn" type="button" data-copy' + idattr + ">" + label + "</button></div>"


MOCKS = {'autoquest': '<div class="mock-l"><span class="dim">Quest</span> Play a game for 15 minutes</div><div class="mock-l"><progress value="8" max="15"></progress> 8 of 15 min</div><div class="mock-l"><span class="dim">Status</span> <span class="ok">running, claims the reward when due</span></div>', 'idle-lounge': '<div class="mock-l"><span class="dim">Garden</span> 4.32K coins, 3.3 per second</div><div class="mock-l"><span class="dim">Fishing</span> Caught a trout and 2 more</div><div class="mock-l"><span class="dim">Bricks</span> Level 5, 12 balls</div>', 'my-profile': '<div class="mock-l">yourname <img src="/assets/badges/dev.svg" alt="" width="22" height="22"><img src="/assets/badges/og.svg" alt="" width="22" height="22"></div><div class="mock-l dim">Discord+ OG #7, since October 22, 2026</div><div class="mock-l"><span class="dim">Display name</span> only you see this one</div>', 'lite-mode': '<div class="mock-l"><span class="dim">Animations</span> On, then Off</div><div class="mock-l"><span class="dim">Blur behind menus</span> On, then Off</div><div class="mock-l"><span class="dim">Animated avatars</span> On, then Still</div>', 'reminders': '<div class="mock-l"><span class="dim">&gt;</span> /remind in:10m about:call back</div><div class="mock-l"><span class="value">Reminder</span> call back, with a chime</div>', 'message-archive': '<div class="mock-l"><span class="risk">deleted</span> see you at 8</div><div class="mock-l">see you at 9 <span class="dim">(edited)</span></div>', 'nickname-history': '<div class="mock-l"><span class="dim">Oct 12</span> tsar_old</div><div class="mock-l"><span class="dim">Oct 17</span> tsar</div><div class="mock-l"><span class="dim">Oct 22</span> Tsar</div>', 'last-seen': '<div class="mock-l"><span class="dim">Last seen</span> today 21:40</div><div class="mock-l"><span class="dim">Because</span> sent a message</div>', 'user-tags': '<div class="mock-l">Tsar <span class="value">[work]</span> <span class="value">[owes money]</span></div><div class="mock-l dim">Hover a tag to read your note</div>', 'bulk-export': '<div class="mock-l"><span class="dim">Channel</span> general</div><div class="mock-l"><span class="dim">Saved to</span> general.json</div>', 'auto-leave-vc': '<div class="mock-l">You are the only one here</div><div class="mock-l"><span class="value">Leaving in 30 seconds</span></div>', 'second-account': '<div class="mock-l"><span class="value">Ctrl+Shift+2</span> Account 1 and Account 2</div><div class="mock-l dim">Both stay connected</div>'}


def mock_html(p):
    m = MOCKS.get(p["id"])
    if not m:
        return ""
    return '<div class="mock" role="img" aria-label="Drawn illustration of ' + e(p["name"]) + '">' + m + '<div class="mock-l dim cap">Illustration, not a screenshot.</div></div>'


def fact_rows(p):
    out = ""
    for k, v in p["facts"]:
        klass = ' class="risk"' if (p.get("risk") and k == "Risk") else ""
        out += "<dt>" + e(k) + "</dt><dd" + klass + ">" + e(v) + "</dd>"
    return out


def help_html(p):
    return "<p>" + e(p["short"]) + "</p>" + mock_html(p) + "<dl>" + fact_rows(p) + "</dl>"


def contract(thesis_extra=""):
    return '''<!--
THESIS: The website is the setup utility of your Discord: plugins are menu items you switch on. It refuses the dev-tool landing page (hero, card grid, feature icons).
OWN-WORLD: Firmware setup screen. Blue text-mode field, grey title bar and tabs, white text, cyan frame titles, yellow values, double-line frames, selection as an inverse bar. One bitmap face (VT323) at two sizes on a character cell grid. Light theme is a pale UEFI sheet with navy bars.
STORY: A visitor learns that Discord+ is a Vencord fork with plugins nobody else ships, sees they are all off until switched on, sees every byte stays on their PC except one named lookup, and copies one command.
FIRST VIEWPORT: Left, the Discord+ wordmark at display size with a two-line promise, then the plugin menu as firmware options. Right, the help pane for the selected item and the install command with its Copy button beneath it. Key hints along the bottom bar.
FORM: Firmware setup utility, candidate 4 of my grounded list, seed key 175bc1b0 (assigned by the roll).
FINISH: unreviewed and undocumented is unfinished; this build ends with the finish review, the verdict, and DESIGN.md
-->
'''


# ------------------------------------------------------------------ pages
def home():
    rows = ""
    helps = ""
    for pid in HOME_ROWS:
        p = BY_ID[pid]
        built = pid == "second-account"
        risk_note = " It breaks the Discord rules, read the warning below." if p.get("risk") else ""
        if built:
            rows += (f'<li><button class="row" type="button" data-help="{pid}"><span class="name">{e(p["name"])}</span>'
                     f'<span class="val" data-on="true" aria-hidden="true">[Built in]</span><span class="blurb">{e(p["short"])}</span></button></li>')
        else:
            rows += (f'<li><button class="row" type="button" data-help="{pid}" data-toggle data-on="false" aria-pressed="false">'
                     f'<span class="name">{e(p["name"])}</span><span class="val" data-on="false" aria-hidden="true">[Disabled]</span>'
                     f'<span class="blurb">{e(p["short"])}{risk_note}</span></button></li>')
        helps += f'<div class="help-src" id="help-{pid}" data-title="{e(p["name"])}">{help_html(p)}</div>\n'
    rows += '<li><a class="row" href="/plugins" data-help="more"><span class="name">All plugins and what they do</span><span class="val">[Open]</span></a></li>'
    helps += ('<div class="help-src" id="help-more" data-title="All plugins">'
              '<p>Eleven plugins were written for Discord+, plus the second account window. The catalog explains each one and lets you search it.</p>'
              '<p class="dim">Every plugin from Vencord is still there in the same settings page.</p></div>\n')

    rows_html = f'<ul class="rows" id="plugin-menu" role="list">{rows}</ul>'

    storage = [
        ("MessageArchive", "your PC, 7 days", "never"),
        ("NicknameHistory", "your PC", "never"),
        ("LastSeen", "your PC", "never"),
        ("UserTags", "your PC", "never"),
        ("Reminders", "your PC", "never"),
        ("Idle Lounge", "a file on your PC", "never"),
        ("MyProfile", "your PC", "badge lookups with user IDs, if on"),
    ]
    table = '<div class="table"><div class="tr th"><span>Plugin</span><span>Kept on</span><span class="c3">Sent to the Discord+ server</span></div>'
    for a, b, c in storage:
        cls = "g" if c == "never" else "r"
        table += '<div class="tr"><span>' + e(a) + '</span><span>' + e(b) + '</span><span class="' + cls + ' c3" data-label="Sent to the Discord+ server: ">' + e(c) + '</span></div>'
    table += "</div>"

    faq = [
        ("Is Discord+ safe to use?",
         ["It is open source, so every line can be read, and nothing it saves leaves your PC apart from the MyProfile lookups in the table above.",
          "Client mods, Discord+ included, go against Discord's terms of service and Discord may act against accounts that use them. AutoQuest raises that risk. You use Discord+ at your own risk."]),
        ("Which systems does it run on?",
         ["It is tested on Windows with the stable Discord desktop app. It also works on Linux (tested on Arch with the official Discord package). The macOS installer exists but has not been tested yet, so open an issue if it breaks."]),
        ("Do I have to remove Vencord first?",
         ["You do not need to uninstall it by hand. The installer points Discord at Discord+ instead. Discord+ reads the same settings folder as Vencord, so your existing Vencord settings carry over."]),
        ("What is the member number?",
         ["If MyProfile is on, Discord+ gives your account a number in order of arrival and records the date you joined. Other Discord+ users see it as a badge on your profile. It is a setting you can turn off, and then nothing is sent."]),
        ("What does it cost?",
         ["Nothing. It is free software under the GNU General Public License v3.0."]),
        ("How do I update or remove it?",
         ["Discord+ updates itself. While Discord is open it checks for a new version every half hour, downloads and builds it, and shows a notice. You restart Discord once and you are on the new version.",
          'To remove it, run <code>pnpm uninject</code> inside the Discord+ folder. The <a href="/install">install page</a> has the details.']),
    ]
    faq_html = ""
    for q, answers in faq:
        faq_html += f'<details><summary>{e(q)}</summary><div class="answer">' + "".join(f"<p>{a if '<' in a else e(a)}</p>" for a in answers) + "</div></details>"

    install_cmd = cmd_box(CMD, "install-copy", 'Copy<span class="fkey"> (F10)</span>', prompt="")

    body = f'''{contract()}<main id="main">
<div class="wrap">
<div class="screen">
<div class="intro">
<h1 class="display">Discord<span class="plus">+</span></h1>
<p class="lede">A free fork of Vencord for the Discord desktop app. Every Vencord plugin still works, and eleven more were written for it: quests on autopilot, a game lounge, your own profile badges and a lighter Discord. What it saves stays on your PC.<span class="caret" aria-hidden="true"></span></p>
</div>

<section class="pane menu-pane" aria-labelledby="menu-title">
<h2 class="pane-title" id="menu-title">Plugins</h2>
{rows_html}
<p class="note">This is a preview, so nothing is installed by clicking here. In Discord every plugin starts off, and you switch on what you want. <span class="value" id="on-count">0 of 6</span> on in this preview.</p>
</section>

<div class="side">
<section class="pane help" aria-labelledby="help-pane-title">
<h2 class="pane-title" id="help-pane-title">Item Specific Help</h2>
<div id="help-live" aria-live="polite"><h3 id="help-title" class="title">AutoQuest</h3>
<div id="help-body"></div></div>
{helps}</section>

<section class="pane install" aria-labelledby="install-title">
<h2 class="pane-title" id="install-title">Install</h2>
<p>One command, in PowerShell on Windows:</p>
<div class="gap8"></div>
{install_cmd}
<p class="sub">Needs Git and Node.js 22 or newer. It asks which Discord to patch. macOS or Linux? The <a href="/install">install page</a> has a Terminal command. Tested on Linux, not yet on macOS.</p>
<p class="sub risk-line">Client mods break Discord's rules, and AutoQuest is the riskiest part. <a href="#warn-title">Read the warning</a>.</p>
<div class="actions">
<a class="btn alt" href="/install.ps1">Read the script first</a>
<a class="btn alt" href="/install">Step by step</a>
</div>
</section>
</div>
</div>

<div class="block">
<section class="pane" aria-labelledby="storage-title">
<h2 class="pane-title" id="storage-title">Storage Configuration</h2>
<p class="lead70">Where each plugin keeps its data, and what it sends out. There is no account and no tracking. The only contact with the Discord+ server is the MyProfile lookup, which sends user IDs, and you can switch it off.</p>
{table}
</section>

<section class="pane warn" aria-labelledby="warn-title">
<h2 class="pane-title" id="warn-title">Warning</h2>
<p class="lead76">Client mods, Discord+ included, go against Discord's terms of service. AutoQuest is the riskiest part: other users report temporary Quest suspensions for what Discord calls inauthentic quest completion. Use it on an account you can afford to lose, or leave that plugin off. You use Discord+ at your own risk.</p>
</section>

<section class="pane faq" aria-labelledby="faq-title">
<h2 class="pane-title" id="faq-title">Questions</h2>
{faq_html}
</section>
</div>
</div>
</main>
'''
    hints = ['<span class="hint-keys"><kbd>Up</kbd><kbd>Down</kbd>Select item</span>',
             '<span class="hint-keys"><kbd>Enter</kbd>Switch on or off</span>',
             '<span class="hint-keys"><kbd>F10</kbd>Copy install command</span>',
             '<span class="hint-keys"><kbd>Esc</kbd>Reset the preview</span>']
    return (head("Discord+ | Vencord fork with quests, a game lounge, profile badges and more",
                 "Discord+ is a free Vencord fork for the Discord desktop app with eleven extra plugins: AutoQuest, Idle Lounge, MyProfile badges, LiteMode and more. Your data stays on your PC.",
                 "/") + top("home") + body + bottom(hints))


def plugins_page():
    groups = {}
    for p in PLUGINS:
        groups.setdefault(p["group"], []).append(p)
    out = ""
    for g in ["Fun", "Tools", "Chat history", "Appearance", "Built in"]:
        items = ""
        for p in groups.get(g, []):
            search = (p["name"] + " " + p["short"] + " " + p["body"] + " " + g + " " + p["tags"]).lower()
            pts = "".join(f"<li>{e(x)}</li>" for x in p["points"])
            facts = fact_rows(p)
            items += f'''<li class="item" id="{p["id"]}" data-search="{e(search)}">
<button class="row" type="button" aria-expanded="false" aria-controls="d-{p["id"]}"><span class="name">{e(p["name"])} <span class="dim">{e(p["short"])}</span></span><span class="tags">{e(p["tags"])}</span></button>
<div class="detail" id="d-{p["id"]}" hidden><p>{e(p["body"])}</p>{mock_html(p)}<ul>{pts}</ul><dl class="facts">{facts}</dl></div>
</li>'''
        out += f'<section class="group" aria-labelledby="g-{g.replace(" ", "-").lower()}"><h2 id="g-{g.replace(" ", "-").lower()}">{e(g)}</h2><ul class="rows" role="list">{items}</ul></section>'

    body = f'''<main id="main">
<div class="wrap">
<div class="page-head">
<h1>Plugins</h1>
<p>Eleven plugins written for Discord+, plus the second account window. Every plugin from Vencord still works in the same settings page. All Discord+ plugins start off until you switch them on.</p>
</div>
<div class="finder">
<label for="filter">Search</label>
<input id="filter" type="search" placeholder="Type a name or what you want to do" autocomplete="off">
<span class="count" id="shown" role="status"></span>
</div>
<div id="catalog">{out}</div>
<p class="empty" id="none" hidden>No plugin matches that. Clear the search to see them all.</p>
<div class="block"></div>
</div>
</main>
'''
    hints = ['<span>Click a row to open it</span>', '<span class="hint-keys"><kbd>Esc</kbd>Clear the search</span>']
    return (head("Plugins | Discord+", "Every plugin written for Discord+ and what it does: AutoQuest, Idle Lounge, MyProfile, LiteMode, Reminders, MessageArchive and more.", "/plugins")
            + top("plugins") + body + bottom(hints))


def install_page():
    a_steps = f'''<ol class="steps">
<li><div><h3>Run the installer</h3><p><span class="title">Windows.</span> Press the Windows key, type PowerShell, press Enter, and paste:</p>{cmd_box(CMD, None, "Copy")}<p class="mt10"><span class="title">macOS and Linux.</span> Open Terminal and paste. Tested on Linux (Arch), not yet on macOS. If it fails <a href="{GITHUB}/issues" rel="noopener">tell me what it printed</a>:</p>{cmd_box(CMD_UNIX, None, "Copy", prompt="$ ")}</div></li>
<li><div><h3>Pick your Discord</h3><p>Close Discord first. When it asks which Discord to patch, choose the stable one. On macOS and Linux it may ask for your password, because it writes into Discord's own folder.</p></div></li>
<li><div><h3>Switch plugins on</h3><p>Start Discord, open Settings, then Plugins, and switch on the Discord+ plugins you want. They all start off.</p></div></li>
</ol>'''
    b_steps = f'''<ol class="steps">
<li><div><h3>Get the code</h3>{cmd_box("git clone https://github.com/rossinskiy/discord-plus.git" + chr(10) + "cd discord-plus", None, "Copy", prompt="")}</div></li>
<li><div><h3>Install the dependencies</h3>{cmd_box("pnpm install", None, "Copy", prompt="")}</div></li>
<li><div><h3>Build it</h3>{cmd_box("pnpm build", None, "Copy", prompt="")}</div></li>
<li><div><h3>Add it to Discord</h3><p>Close Discord first. Pick your Discord when asked.</p>{cmd_box("pnpm inject", None, "Copy", prompt="")}</div></li>
<li><div><h3>Restart Discord</h3><p>Open Settings, then Plugins, and switch on what you want.</p></div></li>
</ol>'''
    trouble = [
        ("Settings or a window crashes after a Discord update",
         "Discord changed something inside the app. Update Discord+ (see above) and restart Discord."),
        ("The installer says it cannot find Discord",
         "Close Discord completely, including the tray icon, then run it again. Only the stable Discord desktop app is supported."),
        ("I installed the installer from vencord.dev",
         "That one installs stock Vencord, not Discord+. Use the steps on this page instead."),
        ("Something else is wrong",
         "Open an issue on GitHub and say what you did and what happened. A crash helps most with the red error from the console (Ctrl+Shift+I)."),
    ]
    t_html = "".join(f"<details><summary>{e(q)}</summary><div class=\"answer\"><p>{e(a)}</p></div></details>" for q, a in trouble)

    body = f'''<main id="main">
<div class="wrap">
<div class="page-head">
<h1>Install</h1>
<p>Discord+ is installed from source, and the script below does the typing for you. It takes a few minutes.</p>
</div>
<div class="block">
<section class="pane" aria-labelledby="req-title">
<h2 class="pane-title" id="req-title">Requirements</h2>
<ul class="rows" role="list">
<li><span class="row static"><span class="name">Windows</span><span class="val">tested</span></span></li>
<li><span class="row static"><span class="name">Linux</span><span class="val">tested on Arch</span></span></li>
<li><span class="row static"><span class="name">macOS</span><span class="val">not tested yet</span></span></li>
<li><span class="row static"><span class="name">Discord</span><span class="val">stable desktop app</span></span></li>
<li><span class="row static"><span class="name">Git</span><span class="val">any recent version</span></span></li>
<li><span class="row static"><span class="name">Node.js</span><span class="val">22 or newer</span></span></li>
<li><span class="row static"><span class="name">pnpm</span><span class="val">installed for you</span></span></li>
</ul>
<p class="note">Do not use the installers on vencord.dev. They install stock Vencord, not Discord+.</p>
</section>

<section class="pane" aria-labelledby="a-title">
<h2 class="pane-title" id="a-title">Option A: one command</h2>
<p class="lead72">The script checks Git and Node.js, installs pnpm if needed, downloads Discord+ into <span class="value">%USERPROFILE%\\discord-plus</span> (<span class="value">~/discord-plus</span> on macOS and Linux), builds it and runs the Discord installer. It changes nothing else. Read it first, it is short: <a href="/install.ps1">install.ps1</a> for Windows, <a href="/install.sh">install.sh</a> for macOS and Linux.</p>
{a_steps}
</section>

<section class="pane" aria-labelledby="b-title">
<h2 class="pane-title" id="b-title">Option B: step by step</h2>
{b_steps}
</section>

<section class="pane" aria-labelledby="u-title">
<h2 class="pane-title" id="u-title">Update and remove</h2>
<p><span class="title">Update.</span> You do not have to do anything. Discord+ checks for a new version every half hour while Discord is open, downloads it, builds it and shows a notice. Restart Discord when it appears. If a new version fails to build, Discord+ goes back to the version that worked. Running the one command again also updates it.</p>
<p class="mt10"><span class="title">Remove.</span> Inside the Discord+ folder run <code class="value">pnpm uninject</code> and restart Discord. It goes back to normal.</p>
</section>

<section class="pane faq" aria-labelledby="t-title">
<h2 class="pane-title" id="t-title">If something goes wrong</h2>
{t_html}
</section>
</div>
</div>
</main>
'''
    hints = ['<span>Copying a command greys out its step</span>']
    return (head("Install | Discord+", "Install Discord+ on Windows with one PowerShell command, on macOS or Linux with one Terminal command, or step by step from source. Requires Git and Node.js 22 or newer.", "/install")
            + top("install") + body + bottom(hints))


def extract_prose(name):
    with open(os.path.join(HERE, "content", name + ".html"), encoding="utf-8") as f:
        return f.read()


def doc_page(title, h1, path, desc, updated, inner):
    body = f'''<main id="main">
<div class="wrap">
<div class="page-head">
<h1>{e(h1)}</h1>
<p>Last updated {e(updated)}</p>
</div>
<div class="block"><section class="pane" aria-label="{e(h1)}"><div class="prose">
{inner}
</div></section></div>
</div>
</main>
'''
    return head(title, desc, path) + top("") + body + bottom(['<span class="hint-keys"><kbd>Esc</kbd>Close the menu</span>', '<span>Press Top to go back up</span>'])


def not_found():
    body = '''<main id="main">
<div class="wrap">
<div class="block">
<section class="pane warn" aria-labelledby="nf">
<h2 class="pane-title" id="nf">Fatal error</h2>
<p class="display big">404</p>
<p class="lead60">No page lives at this address. The link may be old or mistyped. Pick where to go next:</p>
<div class="actions">
<a class="btn" href="/">Main</a>
<a class="btn alt" href="/plugins">Plugins</a>
<a class="btn alt" href="/install">Install</a>
</div>
</section>
</div>
</div>
</main>
'''
    return head("Page not found | Discord+", "This page does not exist. Go back to the Discord+ home page, the plugin list or the install guide.", "/404") + top("") + body + bottom(['<span>Nothing here</span>'])


def support_page():
    rows = ""
    for w in WALLETS:
        rows += (
            '<div class="wallet"><div class="wallet-name"><span class="title">' + e(w["name"]) + '</span> <span class="dim">' + e(w.get("network", "")) + '</span></div>'
            + '<div class="cmd"><code><span class="seg">' + e(w["address"]) + '</span></code><button class="btn" type="button" data-copy>Copy</button></div></div>'
        )

    services = ""
    if SERVICES:
        buttons = "".join('<a class="btn" href="' + e(x["url"]) + '" rel="noopener">Donate on ' + e(x["name"]) + "</a>" for x in SERVICES)
        services = ('<section class="pane" aria-labelledby="s-title"><h2 class="pane-title" id="s-title">Donate online</h2>'
                    '<p class="lead72">Boosty handles the payment for you, you do not need a crypto wallet.</p>'
                    '<div class="actions">' + buttons + "</div></section>")

    wallets = ""
    check = ""
    if WALLETS:
        wallets = ('<section class="pane" aria-labelledby="w-title"><h2 class="pane-title" id="w-title">Crypto wallets</h2>'
                   '<p class="lead72">These are plain crypto wallets that the author controls, with no middleman and no account. '
                   'Send only the coin on the network named next to each address. Money sent on a different network is lost.</p>'
                   + rows + "</section>")
        check = ('<section class="pane" aria-labelledby="v-title"><h2 class="pane-title" id="v-title">Check the address first</h2>'
                 '<p class="lead72">The same addresses are listed in the project repository, in '
                 '<a href="' + GITHUB + '/blob/main/server/donate.json" rel="noopener">server/donate.json</a>. '
                 'Compare them with the ones above before you send anything, so a tampered page cannot send your money somewhere else.</p></section>')

    message = cmd_box("Supporter badge" + chr(10) + "Discord ID: 123456789012345678" + chr(10) + "Donated: Boosty or which coin" + chr(10) + "Proof: Boosty name or transaction hash", None, "Copy", prompt="")
    badge = (
        '<section class="pane" aria-labelledby="b-title"><h2 class="pane-title" id="b-title">Get your Supporter badge</h2>'
        '<ol class="steps">'
        '<li><div><h3>Donate</h3><p>Any amount, on Boosty or to one of the wallets.</p></div></li>'
        '<li><div><h3>Message me on Telegram</h3><p>Write to <a href="https://t.me/jreinject" rel="noopener">@jreinject</a> and send this, with your own details filled in:</p>' + message + '</div></li>'
        '<li><div><h3>Wait for the badge</h3><p>I check the donation by hand and add the badge within 24 hours. People who run Discord+ with MyProfile switched on then see it on your profile.</p></div></li>'
        '</ol>'
        '<p class="note">Your Discord ID is a long number, not your username. In Discord open Settings, then Advanced, switch on Developer Mode, right-click your own name and choose Copy User ID.</p>'
        "</section>"
    )

    body = (
        '<main id="main"><div class="wrap"><div class="page-head"><h1>Support</h1>'
        "<p>Discord+ is free and stays free. If it saves you time and you want to chip in, the money pays for the server and the hours that go into the project. "
        "Everyone who donates, in any amount, gets the Discord+ Supporter badge on their profile.</p></div>"
        '<div class="block">' + services + wallets + badge + check + "</div></div></main>\n"
    )
    return (head("Support | Discord+", "Support Discord+ with a donation and get the Discord+ Supporter badge. The project is free and stays free, donations pay for the server and the time that goes into it.", "/support")
            + top("support") + body + bottom(['<span>Copy an address and check it against the repository</span>']))


def write(name, content):
    with open(os.path.join(SITE, name), "w", encoding="utf-8", newline="\n") as f:
        f.write(content)


priv = extract_prose("privacy")
terms = extract_prose("terms")
write("index.html", home())
write("plugins.html", plugins_page())
write("install.html", install_page())
write("privacy.html", doc_page("Privacy | Discord+", "Privacy policy", "/privacy",
                                "What the Discord+ website and client do with your data: no cookies, no analytics, optional badge lookups and an optional member number.",
                                "October 23, 2026", priv))
write("terms.html", doc_page("Terms | Discord+", "Terms", "/terms",
                              "The terms of using Discord+: GPL-3.0 license, no warranty, your responsibility and no affiliation with Discord or Vencord.",
                              "October 17, 2026", terms))
write("404.html", not_found())
if HAS_SUPPORT:
    write("support.html", support_page())
# the sitemap lists exactly the pages that exist
pages = ["/", "/plugins", "/install", "/privacy", "/terms"] + (["/support"] if HAS_SUPPORT else [])
NL = chr(10)
urls = "".join("  <url><loc>" + ORIGIN + path + "</loc></url>" + NL for path in pages)
write("sitemap.xml", '<?xml version="1.0" encoding="UTF-8"?>' + NL + '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">' + NL + urls + "</urlset>" + NL)
print("built")
