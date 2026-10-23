/*
 * Vencord, a Discord client mod
 * Copyright (c) 2026 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

// Drawn on a 32x32 grid. Every badge shares one rounded hexagon with a gradient and a
// soft highlight, so they read as a set next to each other, and differs by colour and symbol.
function badge(top: string, bottom: string, ring: string, glyph: string) {
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32">
<defs>
<linearGradient id="g" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${top}"/><stop offset="1" stop-color="${bottom}"/></linearGradient>
<linearGradient id="s" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#fff" stop-opacity=".38"/><stop offset=".55" stop-color="#fff" stop-opacity="0"/></linearGradient>
</defs>
<path d="M16 2.2 28 9v14L16 29.8 4 23V9z" fill="url(#g)" stroke="${ring}" stroke-width="1.6" stroke-linejoin="round"/>
<path d="M16 3.4 26.9 9.6v6.2C22.4 17.4 9.6 17.4 5.1 15.8V9.6z" fill="url(#s)"/>
${glyph}
</svg>`;
    return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
}

const W = "#fff";

export const BADGE_ICONS: Record<string, string> = {
    // </> brackets
    dev: badge("#34d399", "#047857", "#064e3b",
        `<g fill="none" stroke="${W}" stroke-width="2.3" stroke-linecap="round" stroke-linejoin="round">
<path d="M12.2 11.6 7.8 16l4.4 4.4M19.8 11.6 24.2 16l-4.4 4.4M17.6 10.6l-3.2 10.8"/></g>`),

    // flask with bubbles
    tester: badge("#60a5fa", "#1d4ed8", "#1e3a8a",
        `<path d="M13.4 8.6h5.2M14.4 8.6v5.1l-4.2 7.2c-.7 1.3.2 2.9 1.7 2.9h8.2c1.5 0 2.4-1.6 1.7-2.9l-4.2-7.2V8.6" fill="none" stroke="${W}" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"/>
<path d="M12.2 18.4c1.2-.9 2.4.9 3.8 0s2.6-.9 3.8 0l1.7 3c.4.8-.1 1.7-1 1.7H11.5c-.9 0-1.4-.9-1-1.7z" fill="${W}" fill-opacity=".9"/>
<circle cx="15" cy="20.4" r=".8" fill="#1d4ed8"/><circle cx="17.6" cy="19.6" r=".6" fill="#1d4ed8"/>`),

    // heart with a sparkle
    supporter: badge("#f472b6", "#be185d", "#831843",
        `<path d="M16 22.6s-7-4.3-7-9.2c0-2.6 2-4.2 4-4.2 1.4 0 2.5.8 3 1.8.5-1 1.6-1.8 3-1.8 2 0 4 1.6 4 4.2 0 4.9-7 9.2-7 9.2z" fill="${W}"/>
<path d="M23.4 7.2l.6 1.5 1.5.6-1.5.6-.6 1.5-.6-1.5-1.5-.6 1.5-.6z" fill="${W}"/>`),

    // crown
    founder: badge("#fcd34d", "#b45309", "#78350f",
        `<path d="M8.6 21.4 7.6 11.8l4.9 3.9 3.5-6 3.5 6 4.9-3.9-1 9.6z" fill="${W}"/>
<rect x="8.6" y="22.4" width="14.8" height="2.2" rx="1" fill="${W}"/>
<circle cx="16" cy="9.2" r="1.3" fill="#fde68a"/><circle cx="7.6" cy="11" r="1.1" fill="#fde68a"/><circle cx="24.4" cy="11" r="1.1" fill="#fde68a"/>`),

    // beetle
    bughunter: badge("#a78bfa", "#5b21b6", "#3b0764",
        `<g stroke="${W}" stroke-width="1.5" stroke-linecap="round" fill="none">
<path d="M11 15.2 7.6 13.6M11 18.4H7.2M11.4 21.4 8.2 23.6M21 15.2l3.4-1.6M21 18.4h3.8M20.6 21.4l3.2 2.2M14.6 9.8 13 7.6M17.4 9.8 19 7.6"/></g>
<ellipse cx="16" cy="18.4" rx="5" ry="6.2" fill="${W}"/>
<circle cx="16" cy="11.8" r="2.7" fill="${W}"/>
<path d="M16 13.4v10.8" stroke="#5b21b6" stroke-width="1.3"/>
<circle cx="13.6" cy="17" r="1" fill="#5b21b6"/><circle cx="18.4" cy="17" r="1" fill="#5b21b6"/><circle cx="13.9" cy="20.8" r=".9" fill="#5b21b6"/><circle cx="18.1" cy="20.8" r=".9" fill="#5b21b6"/>`),

    // palette
    artist: badge("#2dd4bf", "#0e7490", "#134e4a",
        `<path d="M16 8.4c-5 0-8.6 3.5-8.6 7.6 0 4.5 3.8 7.6 8 7.6 2 0 2.4-1.5 1.4-2.6-1-1.1-.3-2.5 1.2-2.5h2c2.4 0 4.6-1.7 4.6-4C24.6 11 21 8.4 16 8.4z" fill="${W}"/>
<circle cx="12.4" cy="14.2" r="1.5" fill="#ef4444"/><circle cx="16.2" cy="12.2" r="1.5" fill="#f59e0b"/><circle cx="20.2" cy="14" r="1.5" fill="#3b82f6"/><circle cx="12.8" cy="18.6" r="1.5" fill="#22c55e"/>`)
};

// The "member number" badge. The colour says how early someone joined.
export const UID_ICONS = {
    og: badge("#fde68a", "#d97706", "#78350f",
        `<path d="M16 8.2v15.6M8.2 16h15.6" stroke="#fff" stroke-width="3.2" stroke-linecap="round"/>
<path d="M23.6 6.6l.7 1.8 1.8.7-1.8.7-.7 1.8-.7-1.8-1.8-.7 1.8-.7z" fill="#fff"/>`),
    early: badge("#e2e8f0", "#64748b", "#334155",
        "<path d=\"M16 8.6v14.8M8.6 16h14.8\" stroke=\"#fff\" stroke-width=\"3.2\" stroke-linecap=\"round\"/>"),
    member: badge("#4ade80", "#15803d", "#14532d",
        "<path d=\"M16 9v14M9 16h14\" stroke=\"#fff\" stroke-width=\"3.2\" stroke-linecap=\"round\"/>")
};
