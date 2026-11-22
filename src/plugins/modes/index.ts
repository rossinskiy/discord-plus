/*
 * Vencord, a Discord client mod
 * Copyright (c) 2026 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { ApplicationCommandInputType, ApplicationCommandOptionType, findOption, sendBotMessage } from "@api/Commands";
import * as DataStore from "@api/DataStore";
import { isPluginEnabled, pluginRequiresRestart, startDependenciesRecursive, startPlugin, stopPlugin } from "@api/PluginManager";
import { Settings } from "@api/Settings";
import { Devs } from "@utils/constants";
import { t } from "@utils/i18n";
import definePlugin from "@utils/types";

import Plugins from "~plugins";

import { cleanModeName, diffModes } from "./diff";

const STORE_KEY = "Modes_data";
const UNDO_KEY = "Modes_undo";
const OWN_NAME = "Modes";

type SavedModes = Record<string, string[]>;

let saved: SavedModes = {};
let undoSnapshot: string[] | undefined;

/** Plugins a mode may switch: not required, not hidden, no restart needed, and not this plugin itself. */
function switchableNames(): Set<string> {
    return new Set(Object.values(Plugins)
        .filter(p => p.name !== OWN_NAME && !p.required && !p.hidden && !p.name.startsWith("_") && !pluginRequiresRestart(p))
        .map(p => p.name));
}

function enabledSwitchable(): string[] {
    const ok = switchableNames();
    return [...ok].filter(n => isPluginEnabled(n));
}

function setEnabled(name: string, on: boolean): boolean {
    const plugin = Plugins[name];
    const settings = Settings.plugins[name];
    if (!plugin || !settings) return false;
    if (on) {
        startDependenciesRecursive(plugin);
        if (!startPlugin(plugin)) return false;
    } else if (plugin.started && !stopPlugin(plugin)) {
        return false;
    }
    settings.enabled = on;
    return true;
}

export default definePlugin({
    name: OWN_NAME,
    authors: [Devs.Tsar],
    description: "Save the plugins you have on as a named mode, such as Work or Gaming, and switch between modes with one command. Only plugins that need no restart are switched, the others stay as they are. Switching also keeps a copy of what was on before, so /mode undo brings it back.",
    tags: ["Organisation", "Utility"],

    async start() {
        saved = await DataStore.get<SavedModes>(STORE_KEY) ?? {};
        undoSnapshot = await DataStore.get<string[]>(UNDO_KEY);
    },

    commands: [{
        name: "mode",
        description: t("Save and switch sets of plugins"),
        inputType: ApplicationCommandInputType.BUILT_IN,
        options: [
            {
                name: "action", description: t("What to do"), type: ApplicationCommandOptionType.STRING, required: true,
                choices: [
                    { name: "save", label: t("save: remember the plugins that are on now"), value: "save" },
                    { name: "use", label: t("use: switch to a saved mode"), value: "use" },
                    { name: "list", label: t("list: show saved modes"), value: "list" },
                    { name: "delete", label: t("delete: forget a saved mode"), value: "delete" },
                    { name: "undo", label: t("undo: go back to before the last switch"), value: "undo" }
                ]
            },
            { name: "name", description: t("The name of the mode"), type: ApplicationCommandOptionType.STRING, required: false }
        ],
        execute(args, ctx) {
            const say = (content: string) => sendBotMessage(ctx.channel.id, { content });
            const action: string = findOption(args, "action", "");
            const raw: string = findOption(args, "name", "");
            const name = cleanModeName(raw);

            if (action === "list") {
                const names = Object.keys(saved);
                return say(names.length ? t("Saved modes: {names}", { names: names.join(", ") }) : t("No saved modes yet. Save one with `/mode action:save name:Work`."));
            }
            if (action === "undo") {
                if (!undoSnapshot) return say(t("Nothing to undo."));
                return say(applyMode(undoSnapshot));
            }
            if (!name) return say(t("Give a mode name: letters, numbers, spaces, up to 30."));

            if (action === "save") {
                saved[name] = enabledSwitchable();
                DataStore.set(STORE_KEY, saved);
                return say(t("Saved mode \"{name}\" with {n} plugins.", { name, n: saved[name].length }));
            }
            if (action === "delete") {
                if (!saved[name]) return say(t("There is no mode \"{name}\".", { name }));
                delete saved[name];
                DataStore.set(STORE_KEY, saved);
                return say(t("Deleted mode \"{name}\".", { name }));
            }
            if (action === "use") {
                if (!saved[name]) return say(t("There is no mode \"{name}\".", { name }));
                undoSnapshot = enabledSwitchable();
                DataStore.set(UNDO_KEY, undoSnapshot);
                return say(applyMode(saved[name]));
            }
        }
    }]
});

function applyMode(wanted: string[]): string {
    const { enable, disable } = diffModes(enabledSwitchable(), wanted, switchableNames());
    const failed: string[] = [];
    for (const n of disable) if (!setEnabled(n, false)) failed.push(n);
    for (const n of enable) if (!setEnabled(n, true)) failed.push(n);

    const done = t("Switched: {on} turned on, {off} turned off.", { on: enable.length - failed.filter(f => enable.includes(f)).length, off: disable.length - failed.filter(f => disable.includes(f)).length });
    return failed.length ? done + " " + t("These failed: {names}.", { names: failed.join(", ") }) : done;
}
