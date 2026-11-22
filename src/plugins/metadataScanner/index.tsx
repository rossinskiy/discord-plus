/*
 * Vencord, a Discord client mod
 * Copyright (c) 2026 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { sendBotMessage } from "@api/Commands";
import { findGroupChildrenByChildId, NavContextMenuPatchCallback } from "@api/ContextMenu";
import { Devs } from "@utils/constants";
import { t } from "@utils/i18n";
import definePlugin from "@utils/types";
import type { Message, MessageAttachment } from "@vencord/discord-types";
import { Menu, SelectedChannelStore, showToast, Toasts } from "@webpack/common";

import { readExif, readPngText } from "./exif";

const MAX_BYTES = 25 * 1024 * 1024;
const MAX_TEXT = 300;

async function scan(file: MessageAttachment) {
    const channelId = SelectedChannelStore.getChannelId();
    const say = (content: string) => sendBotMessage(channelId, { content });

    if (file.size > MAX_BYTES) return say(t("{name} is too big to scan.", { name: file.filename }));
    try {
        const res = await fetch(file.url);
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data = new Uint8Array(await res.arrayBuffer());

        const lines: string[] = [];
        const exif = readExif(data);
        if (exif) {
            if (exif.make || exif.model) lines.push(t("Camera: {camera}", { camera: [exif.make, exif.model].filter(Boolean).join(" ") }));
            if (exif.software) lines.push(t("Software: {software}", { software: exif.software }));
            if (exif.takenAt) lines.push(t("Taken: {time}", { time: exif.takenAt }));
            if (exif.gps) lines.push(t("Location: {lat}, {lon}", { lat: exif.gps.lat, lon: exif.gps.lon }) + ` https://www.openstreetmap.org/?mlat=${exif.gps.lat}&mlon=${exif.gps.lon}#map=15/${exif.gps.lat}/${exif.gps.lon}`);
        }
        for (const { key, text } of readPngText(data)) {
            lines.push(`${key}: ${text.length > MAX_TEXT ? text.slice(0, MAX_TEXT) + "..." : text}`);
        }

        say(lines.length
            ? t("Metadata in {name}:", { name: file.filename }) + "\n" + lines.join("\n")
            : t("No metadata found in {name}. Discord removes most of it on upload.", { name: file.filename }));
    } catch (err) {
        console.error("[MetadataScanner] failed", err);
        showToast(t("Could not scan the file."), Toasts.Type.FAILURE);
    }
}

const messageCtxPatch: NavContextMenuPatchCallback = (children, { message }: { message: Message; }) => {
    const images = (message?.attachments ?? []).filter(a => a.content_type === "image/jpeg" || a.content_type === "image/png");
    if (!images.length) return;
    const group = findGroupChildrenByChildId("copy-text", children) ?? findGroupChildrenByChildId("copy-link", children);
    if (!group) return;

    group.push(
        images.length === 1
            ? <Menu.MenuItem id="vc-scan-metadata" label={t("Scan image metadata")} action={() => scan(images[0])} />
            : <Menu.MenuItem id="vc-scan-metadata" label={t("Scan image metadata")}>
                {images.map((f, i) => (
                    <Menu.MenuItem key={f.id} id={`vc-scan-metadata-${i}`} label={f.filename} action={() => scan(f)} />
                ))}
            </Menu.MenuItem>
    );
};

export default definePlugin({
    name: "MetadataScanner",
    authors: [Devs.Tsar],
    description: "Right-click a message with a JPEG or PNG and scan it for hidden data: the camera, the time, a GPS location, and text a program saved in the file, such as the prompt of an AI image. The file is read on your computer, nothing is sent anywhere. Discord removes most metadata when a picture is uploaded, so many files show nothing.",
    tags: ["Media", "Privacy"],

    contextMenus: {
        "message": messageCtxPatch
    }
});
