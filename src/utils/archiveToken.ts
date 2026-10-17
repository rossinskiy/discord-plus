/*
 * Vencord, a Discord client mod
 * Copyright (c) 2026 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { Settings } from "@api/Settings";

/**
 * The Discord+ plugins that talk to the archive server share one token. A plugin
 * uses its own token if set, otherwise it falls back to MessageArchive's.
 */
export function getArchiveToken(ownToken: string | undefined): string {
    return ownToken || (Settings.plugins as any).MessageArchive?.token || "";
}
