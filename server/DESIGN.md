---
name: Discord+ Setup Utility
description: The Discord+ website as a firmware setup screen. Plugins are menu items you switch on.
colors:
  field: "#0000aa"
  field-deep: "#00007a"
  text: "#ffffff"
  dim: "#b4b4e6"
  line: "#aaaaaa"
  bar: "#aaaaaa"
  bar-ink: "#000000"
  hi: "#aaaaaa"
  hi-ink: "#0000aa"
  title: "#55ffff"
  value: "#ffff55"
  ok: "#55ff55"
  warn: "#ff8080"
  warn-field: "#1a0000"
  code: "#000070"
  light-field: "#f2f2ee"
  light-field-deep: "#e4e4de"
  light-text: "#0b0b3a"
  light-dim: "#4a4a70"
  light-navy: "#000080"
  light-title: "#00508a"
  light-value: "#7a3d00"
  light-ok: "#0a6a1a"
  light-warn: "#a40000"
  light-warn-field: "#fff0f0"
  light-focus: "#b30000"
  light-code: "#e0e0f2"
typography:
  display:
    fontFamily: "VT323, Cascadia Mono, Consolas, Lucida Console, monospace"
    fontSize: "clamp(3rem, 8vw, 5.4rem)"
    fontWeight: 400
    lineHeight: 0.95
    letterSpacing: "0"
  page-title:
    fontFamily: "VT323, Cascadia Mono, Consolas, Lucida Console, monospace"
    fontSize: "clamp(2.6rem, 6vw, 4rem)"
    fontWeight: 400
    lineHeight: 1
  body:
    fontFamily: "VT323, Cascadia Mono, Consolas, Lucida Console, monospace"
    fontSize: "22px"
    fontWeight: 400
    lineHeight: 1.3
    letterSpacing: "0.01em"
rounded:
  none: "0"
spacing:
  xs: "4px"
  sm: "8px"
  md: "16px"
  lg: "28px"
components:
  pane:
    backgroundColor: "{colors.field}"
    textColor: "{colors.text}"
    rounded: "{rounded.none}"
    padding: "28px 20px 18px"
  pane-title:
    textColor: "{colors.title}"
    backgroundColor: "{colors.field}"
    padding: "0 8px"
  menu-row:
    backgroundColor: "{colors.field}"
    textColor: "{colors.text}"
    padding: "1px 10px 1px 2.2ch"
  menu-row-selected:
    backgroundColor: "{colors.hi}"
    textColor: "{colors.hi-ink}"
  title-bar:
    backgroundColor: "{colors.bar}"
    textColor: "{colors.bar-ink}"
    height: "44px"
  tab-active:
    backgroundColor: "{colors.field}"
    textColor: "{colors.text}"
    padding: "0 14px"
  button-primary:
    backgroundColor: "{colors.hi}"
    textColor: "{colors.hi-ink}"
    rounded: "{rounded.none}"
    padding: "4px 14px"
  button-primary-hover:
    backgroundColor: "{colors.value}"
    textColor: "{colors.bar-ink}"
  command-block:
    backgroundColor: "{colors.code}"
    textColor: "{colors.text}"
    padding: "8px 12px"
  finder-input:
    backgroundColor: "{colors.code}"
    textColor: "{colors.text}"
    rounded: "{rounded.none}"
    padding: "4px 10px"
---

# Design System: Discord+ Setup Utility

## Overview

**Creative North Star: "The Setup Utility"**

The site is the BIOS-style setup screen of your Discord. A blue text-mode field carries grey title and tab bars, white text, cyan frame titles and yellow values. Plugins are menu rows that read like firmware options, with the name on the left and a bracketed value on the right (`[Disabled]`, `[Built in]`, `[Open]`). Selection is an inverse bar, not an accent glow. One bitmap face lives on a character cell grid, and structure comes from double-line frames, not from cards, shadows or icons.

The light theme is not an inversion. It is a pale UEFI sheet (warm off-white field) with navy bars and navy frame lines, and every role keeps the same job. The theme follows the OS preference unless the visitor picks one with the Theme tab.

Density is terminal-tight: rows are one line with 1px vertical padding, and panes are separated by 28px. The tone is plain and literal, like a settings screen.

**Key Characteristics:**
- Two themes of one role set: classic blue field (dark), pale sheet with navy bars (light).
- One face, VT323, with no weight variation. Hierarchy comes from size (display vs cell size) and from role color.
- Frames are `3px double` lines with the title cut into the top edge.
- Selection, hover and keyboard focus on a menu row are all the same inverse bar.
- Zero radius and no shadows anywhere.

## Colors

A saturated blue field with a restrained role palette: each color has exactly one job, and the job is the same in both themes.

### Primary
- **Field Blue** (`field`, #0000aa): The page and pane background in dark. In light it is replaced by Pale Sheet.
- **Selection Grey** (`hi` with `hi-ink`, #aaaaaa on #0000aa): The inverse bar. Used for the selected, hovered, open and focused row, `::selection`, the primary button and the skip link. In light it is navy #000080 with white ink.

### Secondary
- **Frame Title Cyan** (`title`, #55ffff): Pane titles, h3 and group headings, table headers, finder labels. Light value `light-title` (#00508a).
- **Value Yellow** (`value`, #ffff55): Option values, links, list dashes, step numbers, the plus in the wordmark, the scroll progress bar, the caret, the active tab underline, and the dark focus ring. Light value `light-value` (#7a3d00).

### Tertiary
- **OK Green** (`ok`, #55ff55): An on state, running status, progress fill, positive table cells. Light value `light-ok` (#0a6a1a).
- **Warn Red** (`warn`, #ff8080 on `warn-field` #1a0000): Risk text and the warning pane (AutoQuest and terms-of-service risk). Light values `light-warn` (#a40000) on `light-warn-field` (#fff0f0).

### Neutral
- **Setup White** (`text`, #ffffff): Body text. Light `light-text` (#0b0b3a).
- **Dim Lavender** (`dim`, #b4b4e6): Secondary text, notes, prompts, tags. Light `light-dim` (#4a4a70).
- **Deep Field** (`field-deep`, #00007a): Scrollbar track and the notice dock. Light `light-field-deep` (#e4e4de).
- **Frame Grey** (`line`, #aaaaaa): Frames, rules and input borders. In light this is navy `light-navy` (#000080).
- **Bar Grey** (`bar`, #aaaaaa with `bar-ink` #000000): Title bar, tab strip and bottom key-hint bar. In light the bar is navy `light-navy` with white ink.
- **Code Navy** (`code`, #000070): Command blocks, the finder input and mock panels. Light `light-code` (#e0e0f2).
- **Pale Sheet** (`light-field`, #f2f2ee): The light theme field.
- **Light Focus Red** (`light-focus`, #b30000): The focus ring in light. In dark the ring uses Value Yellow (#ffff55).

### Named Rules
**The One Job Rule.** Every color has one role (title, value, ok, warn, dim). Do not borrow cyan for emphasis or yellow for decoration. Color tells you what a piece of text is.

**The Inverse Bar Rule.** Selected, hovered, open and keyboard-focused rows share one treatment: the `hi` background with `hi-ink` text, and children (value, tags, blurb, dim) switch to `hi-ink` with it.

**The Role Parity Rule.** A new color is added as a role in both themes, or not at all. Components read roles, never literal hex values.

## Typography

**Display Font:** VT323 (self-hosted woff2, `font-display: swap`, falling back to Cascadia Mono, Consolas, Lucida Console, monospace)
**Body Font:** VT323, same stack
**Label/Mono Font:** VT323. Code uses the same face (`code { font: inherit }`).

**Character:** A bitmap terminal face at a fixed cell size. Antialiasing is switched off (`-webkit-font-smoothing: none`) so edges stay crisp. Widths are measured in `ch` so columns line up like character cells.

### Hierarchy
- **Display** (400, `clamp(3rem, 8vw, 5.4rem)`, 0.95): The home wordmark `Discord+`. A `.big` variant reaches `clamp(3rem, 10vw, 6rem)`.
- **Page title** (400, `clamp(2.6rem, 6vw, 4rem)`, 1): H1 of inner pages.
- **Body / cell** (400, 22px, 1.3, +0.01em; 21px at 900px and below): Everything else. Frame titles, group headings, h3, table headers and labels are body size, set apart only by cyan.
- **Prose measure:** 72ch for legal and prose pages, 54ch for the lede, 60 to 64ch for notes.

### Named Rules
**The Two Sizes Rule.** There is the cell size and there is display size. Do not add intermediate sizes or weights; make hierarchy with color role, placement and frames.

**The Cell Rule.** Offsets and gaps that align text use `ch` (2.2ch row indent, 3ch value gap, 4ch step number column) so the grid reads as character cells.

## Layout

A single centered column (`max-width: 1240px`, 16px side padding, 12px at 520px and below). The home page is a two-column grid at 1.25fr / 1fr: intro and plugin menu on the left, help pane and install pane stacked on the right, with a 28px row gap and a 24px column gap. The help pane holds a fixed `min-height: 372px` above 900px so the install pane does not move under the pointer. Inner pages are stacked panes (28px apart in `.block`), and prose pages cap at 72ch. The page height fills the viewport; a sticky bottom dock holds the dismissable notice, and a bar of key hints sits above the footer.

Responsive behavior (breakpoints 900px, 700px, 520px, 480px):
- At 900px and below the grid becomes one column ordered intro, install, menu, help. The help pane is hidden and each menu row shows its blurb inline instead. The key-hint bar is hidden. The tabs collapse into a Menu button with a dropdown.
- At 700px the dim secondary name in a row stacks under it.
- At 520px the command block stacks its Copy button below the code, and the brand label is hidden.
- Tables collapse to two columns, and the header row is hidden.
- Without JavaScript (`no-js`), the tabs stay visible and the help text for each item is printed.

Spacing is a small set of steps, 4, 8, 16 and 28px, plus the `ch` offsets above. Print styles drop the chrome, force black on white and append link URLs.

## Elevation & Depth

Flat. There are no drop shadows and no blur. Depth is expressed by double-line frames, by a darker `field-deep` for the dock and scrollbar track, and by bar color (grey or navy) against the field. The only `box-shadow` use is `inset` as a 2-3px underline (active tab) or an outline (alt button), which is a line, not elevation. Motion is limited to a blinking caret, a one-time half-second row scan on page open, a scroll progress bar, and short opacity fades. All of it respects `prefers-reduced-motion`.

### Named Rules
**The Flat Screen Rule.** Nothing floats. A new surface is a frame or a bar, not a shadowed card.

## Shapes

Square everywhere (radius 0), including inputs and buttons. Frames are `3px double` in `line`, with the title bar of the frame cut out of the top edge (`top: -0.7em`, field-colored background behind the title). Secondary rules are 2px solid. The warning pane changes its border and fill to the warn pair and does not change its shape. Selection markers are text: a `>` at the left of the current row, `[+]` and `[-]` on FAQ summaries, `-` for list items, `[Disabled]` style values. The logo (a plus on a blue square) is the one pictorial mark, and plugin badges are SVG files.

## Components

### Title bar and tabs
A sticky 44px bar in `bar` with `bar-ink`. Brand at left ("Discord+ Setup Utility", clickable home), tabs at right. Hover and active tabs turn into field-colored tabs with white text; the active tab (`aria-current="page"`) also gets a 3px yellow inset underline. The Theme control is a tab-styled button. A 3px yellow progress bar sits under the bar.

### Frames (panes)
`3px double` border, `28px 20px 18px` padding, cyan title cut into the top edge. `.warn` swaps in the warn border, fill and title color.

### Menu rows
A two-column grid: name left, bracketed value right (yellow, green when on). They are buttons that toggle a preview state (`aria-pressed`) or links. Hover, current (`aria-current`), open and `:focus-visible` all apply the Inverse Bar Rule. The current row has a `>` marker. On narrow screens a blurb line appears under the name.

### Buttons
Square blocks in the `hi` pair (4px 14px). Hover turns yellow with black ink. The alt variant is transparent with a 2px inset line and fills with `hi` on hover. Used for actions such as Copy and the install links.

### Command block
`code` background, 2px `line` border, wrapping text (`pre-wrap`, `overflow-wrap: anywhere`), with a dim non-selectable `$` prompt and an attached Copy button. In the install pane and narrow screens the button stacks below the code.

### Finder
A label in cyan and a square input on the `code` background with a 2px `line` border. It filters the plugin catalog, which is grouped under cyan headings with a 2px rule, and each row expands into an indented detail section.

### FAQ
`details` blocks between 2px rules. The summary starts with `[+]` or `[-]` in yellow and takes the inverse bar on hover.

### Item help and illustrations
The help pane shows a title, a description, an optional mock panel (a `code`-background box, labeled "Illustration, not a screenshot."), and a definition list of facts (Saves data, Discord+ server, Risk), where risk is in warn.

### Footer, key hints and notice
A key-hint bar in `bar` with field-colored `kbd` chips, hidden on narrow and coarse-pointer screens. Below it, the footer holds links and dim legal lines. A sticky bottom notice (`field-deep`, `3px double` top) is dismissable.

## Do's and Don'ts

### Do:
- **Do** express every new surface as a double-line frame with a cyan cut-in title, or as a flat bar.
- **Do** keep selection, hover and focus on interactive rows as the inverse bar, and keep a visible focus ring everywhere else (2px, yellow in dark, red in light).
- **Do** use `ch` for alignment offsets and keep one face at the two sizes.
- **Do** keep the AutoQuest and terms-of-service warning in the warn pane or risk line, always readable.
- **Do** label drawn plugin illustrations as illustrations.
- **Do** check any new color in both themes against its role.

### Don't:
- **Don't** add radius, drop shadows, gradients or blur. The world has none.
- **Don't** use cards on a grid, feature icon tiles or a hero image. The thesis refuses the dev-tool landing page.
- **Don't** introduce a second typeface or font weights.
- **Don't** use color outside its role, such as cyan for body emphasis or green for a decorative accent.
- **Don't** invent metrics, testimonials or screenshots; use drawn, labeled illustrations.
- **Don't** hide state in color alone. Values carry text (`[Disabled]`, `[Built in]`).
