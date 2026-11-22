/*
 * Vencord, a Discord client mod
 * Copyright (c) 2026 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import assert from "node:assert/strict";
import { test } from "node:test";

import { backupFileName, buildBackup } from "../src/plugins/serverBackup/backup";

const server = { id: "S", name: "My Server" };
const NOW = new Date("2026-11-21T10:00:00Z");

test("roles skip @everyone and bot roles, sorted by position, permissions as strings", () => {
    const backup = buildBackup(server, [
        { id: "S", name: "@everyone", color: 0, hoist: false, mentionable: false, permissions: 1n, position: 0, managed: false },
        { id: "b", name: "Bot", color: 0, hoist: false, mentionable: false, permissions: 8n, position: 1, managed: true },
        { id: "2", name: "Mod", color: 255, hoist: true, mentionable: true, permissions: 8796093022208n, position: 3, managed: false },
        { id: "1", name: "Member", color: 0, hoist: false, mentionable: false, permissions: 1024n, position: 2, managed: false }
    ], [], [], NOW);
    assert.deepEqual(backup.roles.map(r => r.name), ["Member", "Mod"]);
    assert.equal(backup.roles[1].permissions, "8796093022208");
    assert.doesNotThrow(() => JSON.stringify(backup));
});

test("channels keep their parent, settings and overwrites", () => {
    const backup = buildBackup(server, [], [
        { id: "c2", name: "voice", type: 2, position: 1, parent_id: "c1", bitrate: 64000, userLimit: 5 },
        { id: "c1", name: "Text Area", type: 4, position: 0, parent_id: null },
        { id: "c3", name: "chat", type: 0, position: 2, parent_id: "c1", topic: "hello", nsfw: true, rateLimitPerUser: 10, permissionOverwrites: { r: { id: "r", type: 0, allow: 3n, deny: 4n } } }
    ], [], NOW);
    assert.deepEqual(backup.channels.map(c => c.id), ["c1", "c2", "c3"]);
    assert.equal(backup.channels[1].userLimit, 5);
    assert.deepEqual(backup.channels[2].overwrites, [{ id: "r", type: 0, allow: "3", deny: "4" }]);
    assert.equal(backup.channels[2].slowmode, 10);
    assert.equal(backup.channels[0].parentId, null);
});

test("the backup is stamped with format, version and time", () => {
    const backup = buildBackup(server, [], [], [{ name: "wave", animated: false, url: "https://cdn/x.png" }], NOW);
    assert.equal(backup.format, "discord-plus-server-backup");
    assert.equal(backup.version, 1);
    assert.equal(backup.savedAt, "2026-11-21T10:00:00.000Z");
    assert.equal(backup.emojis.length, 1);
});

test("file names are safe and dated", () => {
    assert.equal(backupFileName("My: Server?", NOW), "My_ Server_ backup 2026-11-21.json");
    assert.equal(backupFileName("   ", NOW), "server backup 2026-11-21.json");
});
