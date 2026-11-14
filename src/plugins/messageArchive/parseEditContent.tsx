/*
 * Vencord, a Discord client mod
 * Copyright (c) 2026 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { Parser, SelectedChannelStore } from "@webpack/common";

export function parseEditContent(content: string, channelId: string) {
    return Parser.parse(content, true, {
        channelId,
        allowLinks: true,
        allowHeading: true,
        allowList: true,
        allowEmojiLinks: true,
        viewingChannelId: SelectedChannelStore.getChannelId(),
    });
}
