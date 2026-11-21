/*
 * Vencord, a Discord client mod
 * Copyright (c) 2026 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

/** A stream key ends with the id of the person who streams, so this tells if the stream is yours. */
export function isOwnStream(streamKey: string | undefined, myId: string | undefined): boolean {
    return !!streamKey && !!myId && streamKey.endsWith(`:${myId}`);
}
