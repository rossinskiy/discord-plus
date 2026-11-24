---
name: Discord+ Product Page
description: The Discord+ website as a quiet product page. Big type, black and white fields, one green, a drawn window that follows the scroll.
colors:
  bg: "#000000"
  bg2: "#0c0c0e"
  raise: "#161618"
  text: "#f5f5f7"
  dim: "#a1a1a6"
  line: "rgba(255,255,255,.16)"
  accent: "#22c55e"
  accent-ink: "#04210f"
  accent-text: "#4ade80"
  warn: "#ff9a8c"
  warn-bg: "#1d0b09"
  light-bg: "#ffffff"
  light-bg2: "#f5f5f7"
  light-text: "#1d1d1f"
  light-dim: "#6e6e73"
  light-accent-text: "#15803d"
  light-warn: "#b42318"
  light-warn-bg: "#fff1ef"
typography:
  display:
    fontFamily: "Onest, ui-sans-serif, Segoe UI Variable Display, Segoe UI, system-ui, sans-serif"
    fontSize: "clamp(3rem, 9.4vw, 6rem)"
    fontWeight: 700
    lineHeight: 0.98
    letterSpacing: "-0.04em"
  headline:
    fontFamily: "Onest, ui-sans-serif, system-ui, sans-serif"
    fontSize: "clamp(2.25rem, 6.4vw, 4.5rem)"
    fontWeight: 650
    lineHeight: 1.04
    letterSpacing: "-0.035em"
  lead:
    fontFamily: "Onest, ui-sans-serif, system-ui, sans-serif"
    fontSize: "clamp(1.1875rem, 2.2vw, 1.5rem)"
    fontWeight: 400
    lineHeight: 1.4
  body:
    fontFamily: "Onest, ui-sans-serif, system-ui, sans-serif"
    fontSize: "1.0625rem"
    fontWeight: 400
    lineHeight: 1.55
  mono:
    fontFamily: "JetBrains Mono, ui-monospace, Cascadia Mono, Consolas, monospace"
    fontSize: "0.8rem to 0.98rem"
    fontWeight: 500
rounded:
  pill: "980px"
  window: "22px"
  block: "16px"
  panel: "28px"
spacing:
  band: "clamp(4.5rem, 11vw, 9rem)"
  gutter: "clamp(20px, 5vw, 40px)"
components:
  button-primary:
    backgroundColor: "{colors.accent}"
    textColor: "{colors.accent-ink}"
    rounded: "{rounded.pill}"
    padding: "0 24px"
    height: "44px"
  button-alt:
    backgroundColor: "transparent"
    textColor: "{colors.accent-text}"
    rounded: "{rounded.pill}"
  command-block:
    backgroundColor: "#131315"
    textColor: "{colors.text}"
    rounded: "{rounded.block}"
    padding: "14px 14px 14px 20px"
  window:
    backgroundColor: "#17171a"
    textColor: "{colors.text}"
    rounded: "{rounded.window}"
---

# Design System: Discord+ Product Page

## Overview

**Creative North Star: "One sentence per screen."** The site is shown the way a product is shown on a good product page: a black field, a huge plain headline, one honest line under it, and a drawn window that shows what the plugins do. Nothing decorates. Type, space and one green carry the page. It replaces the earlier firmware setup-screen look at the owner's request (a minimal, Apple-style site, with animation).

Bands of full-width color alternate: black, then a near-black or light grey, then black again. A band can stay dark in the light theme (hero, install), like a product on black.

## Colors

One neutral ladder (`bg`, `bg2`, `raise`, `text`, `dim`, `line`) and one green. The green is the only accent: the filled pill button and links. On white the link green is darker (`light-accent-text`) so text holds 4.5:1. Warning and risk use a warm red on a dark red field and are always visible, never tucked away. Components read these roles, never literal hex values. A new color is added as a role in both themes.

## Typography

Onest, self-hosted, variable (latin and cyrillic files with unicode-range). Hierarchy is size and weight only, never color or caps. Display tops out at 6rem with -0.04em tracking, headlines 4.5rem. No eyebrow labels above headings. JetBrains Mono for commands and drawn code only.

## Components

- **Top bar:** sticky, 52px, translucent with a blur, hairline appears on scroll. Logo and name left, text links 14px dim, language, sun/moon theme button, small Install pill. On phones the links fold into a Menu panel.
- **Buttons:** pill, 44px, primary filled green with dark ink, alt outlined green. Hover scales to 1.03. "Learn more" links carry a chevron that slides right.
- **Rows:** hairline-separated lists instead of cards. Name large, description dim under it, a quiet note on the right. Hover shifts the row 8px and turns it green.
- **Window:** the drawn illustration, 22px radius, soft offset shadow. Always captioned "Illustration, not a screenshot" until real screenshots exist.
- **Command block:** 16px radius, dark, Copy button inside at the right (below the code on narrow screens).
- **FAQ:** details and summary with hairlines, the plus turns into a minus by rotation.
- **Notice and to-top:** a compact pill notice at the bottom center, a round back-to-top button at the right.

## Motion

One authored idea: the window on the right of the story follows the step in the middle of the screen and crossfades with blur. Everything else is quiet: the hero lines rise on load (translate 36px, blur 8px, staggered), blocks reveal once on scroll (opacity, translate 28px, blur 6px), the hero illustration drifts away with a scroll-driven animation where supported. Easing is expo-out `cubic-bezier(.16, 1, .3, 1)`. Content is visible without JavaScript. `prefers-reduced-motion` turns it all off.

## Do and Do Not

- Do keep one idea per band and a concrete headline. Do keep the terms warning visible.
- Do put every spacing and style in classes. The server sends `style-src 'self'`, so inline `style` attributes are ignored.
- Do not add cards, gradient text, glow, eyebrow labels, section numbers, emoji, or invented numbers and quotes.
- Do not add a second accent color or a second typeface.
