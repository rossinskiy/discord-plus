import Database from "better-sqlite3";
import express from "express";
import { existsSync, mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const DATA_DIR = join(__dirname, "data");
if (!existsSync(DATA_DIR)) mkdirSync(DATA_DIR);

const TOKEN = process.env.ARCHIVE_TOKEN;
const PORT = process.env.PORT || 8790;
const RETENTION_MS = 7 * 24 * 60 * 60 * 1000;

if (!TOKEN) {
    console.error("ARCHIVE_TOKEN env var is required");
    process.exit(1);
}

const db = new Database(join(DATA_DIR, "archive.db"));
db.pragma("journal_mode = WAL");

db.exec(`
    CREATE TABLE IF NOT EXISTS messages (
        message_id TEXT PRIMARY KEY,
        channel_id TEXT NOT NULL,
        guild_id TEXT,
        author_id TEXT,
        content TEXT,
        attachments TEXT,
        created_at INTEGER NOT NULL,
        updated_at INTEGER NOT NULL,
        deleted_at INTEGER
    );

    CREATE TABLE IF NOT EXISTS edits (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        message_id TEXT NOT NULL,
        old_content TEXT,
        edited_at INTEGER NOT NULL
    );

    CREATE INDEX IF NOT EXISTS idx_edits_message_id ON edits(message_id);
    CREATE INDEX IF NOT EXISTS idx_messages_created_at ON messages(created_at);

    CREATE TABLE IF NOT EXISTS name_changes (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id TEXT NOT NULL,
        guild_id TEXT,
        field TEXT NOT NULL,
        old_value TEXT,
        new_value TEXT,
        changed_at INTEGER NOT NULL
    );

    CREATE INDEX IF NOT EXISTS idx_name_changes_user ON name_changes(user_id);

    CREATE TABLE IF NOT EXISTS presence_events (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id TEXT NOT NULL,
        reason TEXT NOT NULL,
        status TEXT,
        channel_id TEXT,
        timestamp INTEGER NOT NULL
    );

    CREATE INDEX IF NOT EXISTS idx_presence_events_user ON presence_events(user_id);
`);

const getMessage = db.prepare("SELECT * FROM messages WHERE message_id = ?");
const insertMessage = db.prepare(`
    INSERT INTO messages (message_id, channel_id, guild_id, author_id, content, attachments, created_at, updated_at)
    VALUES (@messageId, @channelId, @guildId, @authorId, @content, @attachments, @timestamp, @timestamp)
`);
const updateMessage = db.prepare(`
    UPDATE messages SET content = @content, attachments = @attachments, updated_at = @timestamp
    WHERE message_id = @messageId
`);
const insertEdit = db.prepare(`
    INSERT INTO edits (message_id, old_content, edited_at) VALUES (?, ?, ?)
`);
const markDeleted = db.prepare(`
    UPDATE messages SET deleted_at = ? WHERE message_id = ?
`);
const getEdits = db.prepare("SELECT old_content, edited_at FROM edits WHERE message_id = ? ORDER BY edited_at ASC");
const purgeOld = db.prepare("DELETE FROM messages WHERE created_at < ?");
const purgeOrphanEdits = db.prepare(`
    DELETE FROM edits WHERE message_id NOT IN (SELECT message_id FROM messages)
`);
const clearAll = db.prepare("DELETE FROM messages");
const clearAllEdits = db.prepare("DELETE FROM edits");

const insertNameChange = db.prepare(`
    INSERT INTO name_changes (user_id, guild_id, field, old_value, new_value, changed_at)
    VALUES (@userId, @guildId, @field, @oldValue, @newValue, @timestamp)
`);
const getNameHistory = db.prepare(`
    SELECT guild_id, field, old_value, new_value, changed_at
    FROM name_changes WHERE user_id = ? ORDER BY changed_at ASC
`);
const clearNameHistory = db.prepare("DELETE FROM name_changes");

const insertPresenceEvent = db.prepare(`
    INSERT INTO presence_events (user_id, reason, status, channel_id, timestamp)
    VALUES (@userId, @reason, @status, @channelId, @timestamp)
`);
const getPresenceHistory = db.prepare(`
    SELECT reason, status, channel_id, timestamp
    FROM presence_events WHERE user_id = ? ORDER BY timestamp DESC LIMIT 50
`);
const clearPresence = db.prepare("DELETE FROM presence_events");

function purgeExpired() {
    const cutoff = Date.now() - RETENTION_MS;
    purgeOld.run(cutoff);
    purgeOrphanEdits.run();
}
purgeExpired();
setInterval(purgeExpired, 60 * 60 * 1000);

const app = express();
app.use(express.json({ limit: "2mb" }));

app.use((req, res, next) => {
    res.set("Access-Control-Allow-Origin", "https://discord.com");
    res.set("Access-Control-Allow-Headers", "Authorization, Content-Type");
    res.set("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
    if (req.method === "OPTIONS") return res.sendStatus(204);
    next();
});

app.use((req, res, next) => {
    const auth = req.get("authorization");
    if (auth !== `Bearer ${TOKEN}`) return res.status(401).json({ error: "unauthorized" });
    next();
});

app.post("/events", (req, res) => {
    const events = Array.isArray(req.body?.events) ? req.body.events : [];

    for (const event of events) {
        if (!event?.messageId || !event?.channelId) continue;

        if (event.type === "delete") {
            markDeleted.run(event.timestamp ?? Date.now(), event.messageId);
            continue;
        }

        const attachments = JSON.stringify(event.attachments ?? []);
        const existing = getMessage.get(event.messageId);

        if (!existing) {
            insertMessage.run({
                messageId: event.messageId,
                channelId: event.channelId,
                guildId: event.guildId ?? null,
                authorId: event.authorId ?? null,
                content: event.content ?? "",
                attachments,
                timestamp: event.timestamp ?? Date.now()
            });
        } else if (existing.content !== (event.content ?? "")) {
            insertEdit.run(existing.message_id, existing.content, event.timestamp ?? Date.now());
            updateMessage.run({
                messageId: event.messageId,
                content: event.content ?? "",
                attachments,
                timestamp: event.timestamp ?? Date.now()
            });
        }
    }

    res.json({ ok: true });
});

app.get("/history/:messageId", (req, res) => {
    const message = getMessage.get(req.params.messageId);
    if (!message) return res.status(404).json({ error: "not found" });

    const edits = getEdits.all(req.params.messageId);
    res.json({
        current: {
            content: message.content,
            attachments: JSON.parse(message.attachments || "[]"),
            authorId: message.author_id,
            channelId: message.channel_id,
            guildId: message.guild_id,
            createdAt: message.created_at,
            updatedAt: message.updated_at
        },
        deletedAt: message.deleted_at,
        edits
    });
});

app.post("/clear", (req, res) => {
    clearAllEdits.run();
    clearAll.run();
    res.json({ ok: true });
});

app.post("/name-events", (req, res) => {
    const events = Array.isArray(req.body?.events) ? req.body.events : [];

    for (const event of events) {
        if (!event?.userId || !event?.field) continue;

        insertNameChange.run({
            userId: event.userId,
            guildId: event.guildId ?? null,
            field: event.field,
            oldValue: event.oldValue ?? null,
            newValue: event.newValue ?? null,
            timestamp: event.timestamp ?? Date.now()
        });
    }

    res.json({ ok: true });
});

app.get("/name-history/:userId", (req, res) => {
    const rows = getNameHistory.all(req.params.userId);
    res.json({ history: rows });
});

app.post("/clear-name-history", (req, res) => {
    clearNameHistory.run();
    res.json({ ok: true });
});

app.post("/presence-events", (req, res) => {
    const events = Array.isArray(req.body?.events) ? req.body.events : [];

    for (const event of events) {
        if (!event?.userId || !event?.reason) continue;

        insertPresenceEvent.run({
            userId: event.userId,
            reason: event.reason,
            status: event.status ?? null,
            channelId: event.channelId ?? null,
            timestamp: event.timestamp ?? Date.now()
        });
    }

    res.json({ ok: true });
});

app.get("/presence/:userId", (req, res) => {
    const history = getPresenceHistory.all(req.params.userId);
    if (!history.length) return res.status(404).json({ error: "not found" });
    res.json({ latest: history[0], history });
});

app.post("/clear-presence", (req, res) => {
    clearPresence.run();
    res.json({ ok: true });
});

app.listen(PORT, "127.0.0.1", () => {
    console.log(`Discord+ message archive listening on ${PORT}`);
});
