/*
 * Vencord, a Discord client mod
 * Copyright (c) 2026 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { Settings } from "@api/Settings";

import { ru } from "./ru";
import { ruPlugins } from "./ruPlugins";

export type Locale = "en" | "ru";
export type LocaleSetting = "auto" | Locale;

const dictionaries: Record<Locale, Record<string, string>> = { en: {}, ru };

function detectDiscordLocale(): Locale {
    try {
        const lang = (document.documentElement.lang || navigator.language || "en").toLowerCase();
        return lang.startsWith("ru") ? "ru" : "en";
    } catch {
        return "en";
    }
}

export function getLocale(): Locale {
    const chosen = Settings.locale;
    return chosen === "en" || chosen === "ru" ? chosen : detectDiscordLocale();
}

/**
 * Translate a UI string. English text is the key, so the English UI works with no dictionary at all
 * and a missing Russian entry falls back to English. `{name}` placeholders are filled from `vars`.
 */
export function t(en: string, vars?: Record<string, string | number>): string {
    let out = dictionaries[getLocale()][en] ?? en;
    if (vars) out = out.replace(/\{(\w+)\}/g, (m, k: string) => k in vars ? String(vars[k]) : m);
    return out;
}

/** Description of a plugin in the current language. Plugin names are product names and are never translated. */
export function tPluginDescription(pluginName: string, description: string): string {
    return getLocale() === "ru" ? ruPlugins[pluginName] ?? description : description;
}
