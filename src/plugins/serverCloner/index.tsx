/*
 * Vencord, a Discord client mod
 * Copyright (c) 2026 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { findGroupChildrenByChildId, NavContextMenuPatchCallback } from "@api/ContextMenu";
import { definePluginSettings } from "@api/Settings";
import { Devs } from "@utils/constants";
import { t } from "@utils/i18n";
import definePlugin, { OptionType } from "@utils/types";
import { Guild } from "@vencord/discord-types";
import { ChannelType } from "@vencord/discord-types/enums";
import { Alerts, ChannelStore, EmojiStore, GuildRoleStore, Menu, RestAPI, Toasts } from "@webpack/common";

const settings = definePluginSettings({
    copyEmojis: {
        type: OptionType.BOOLEAN,
        description: t("Also copy the server's custom emojis (up to the 50 static and 50 animated slots a new server has). Emoji uploads are rate limited by Discord and can slow the clone down."),
        default: true
    }
});

// About 45 requests a minute, with a random wobble so the pace is not a perfect metronome.
const DELAY_MIN_MS = 900;
const DELAY_MAX_MS = 1500;
// If Discord asks us to wait longer than this, that part is skipped instead of freezing the whole clone.
const MAX_WAIT_S = 45;
const MAX_STATIC_EMOJI = 50;
const MAX_ANIMATED_EMOJI = 50;
// Bitrate cap of a server without Boosts.
const MAX_BITRATE = 96000;

interface Job {
    source: Guild;
    cancelled: boolean;
}

let job: Job | null = null;

const sleep = (ms: number) => new Promise<void>(r => setTimeout(r, ms));
const pause = () => sleep(DELAY_MIN_MS + Math.random() * (DELAY_MAX_MS - DELAY_MIN_MS));

class Cancelled extends Error { }
class RateLimited extends Error { }

/** One request with the 429 handling every call in this plugin needs. */
async function call<T = any>(method: "get" | "post" | "patch" | "del", url: string, body?: object): Promise<T> {
    for (let attempt = 0; attempt < 4; attempt++) {
        if (job?.cancelled) throw new Cancelled();
        try {
            const res = await (RestAPI as any)[method](body === undefined ? { url } : { url, body });
            return res?.body as T;
        } catch (err: any) {
            if (err?.status === 429) {
                const wait = Number(err?.body?.retry_after ?? 5);
                if (wait > MAX_WAIT_S) throw new RateLimited(t("Discord asked to wait {s}s", { s: Math.ceil(wait) }));
                await sleep(Math.ceil(wait * 1000) + 500);
                continue;
            }
            throw err;
        }
    }
    throw new RateLimited("rate limited too many times");
}

function errorText(err: any) {
    return err?.body?.message ?? err?.message ?? `HTTP ${err?.status ?? "error"}`;
}

async function toDataUrl(url: string): Promise<string | null> {
    try {
        const res = await fetch(url);
        if (!res.ok) return null;
        const blob = await res.blob();
        return await new Promise<string>((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = () => resolve(reader.result as string);
            reader.onerror = () => reject(reader.error);
            reader.readAsDataURL(blob);
        });
    } catch {
        return null;
    }
}

const channelBodyType = (type: number): number | null => {
    switch (type) {
        case ChannelType.GUILD_TEXT:
        case ChannelType.GUILD_ANNOUNCEMENT:
        case ChannelType.GUILD_FORUM:
        case ChannelType.GUILD_MEDIA:
            return ChannelType.GUILD_TEXT;
        case ChannelType.GUILD_VOICE:
        case ChannelType.GUILD_STAGE_VOICE:
            return ChannelType.GUILD_VOICE;
        case ChannelType.GUILD_CATEGORY:
            return ChannelType.GUILD_CATEGORY;
        default:
            return null; // threads, directories and anything else that is not a normal channel
    }
};

function etaText(calls: number) {
    const minutes = Math.max(1, Math.ceil(calls / 45));
    return minutes < 60 ? t("about {n} min", { n: minutes }) : t("about {n} h", { n: (minutes / 60).toFixed(1) });
}

async function runClone(current: Job) {
    const { source } = current;
    const toastId = Toasts.genId();
    const progress = (text: string) => Toasts.show({ id: toastId, type: Toasts.Type.MESSAGE, message: t('Cloning "{name}": {text}', { name: source.name, text }) });

    const notes: string[] = [];
    const roleMap = new Map<string, string>();
    const channelMap = new Map<string, string>();
    let newGuildId = "";
    const stats = { roles: 0, categories: 0, channels: 0, emojis: 0 };

    try {
        // ---- read what we can see ----
        const roles = Object.values(GuildRoleStore.getRolesSnapshot(source.id))
            .filter(r => r.id !== source.id && !r.managed)
            .sort((a, b) => a.position - b.position);
        const everyone = GuildRoleStore.getRole?.(source.id, source.id) ?? GuildRoleStore.getRolesSnapshot(source.id)[source.id];
        const all = Object.values(ChannelStore.getMutableGuildChannelsForGuild(source.id));
        const categories = all.filter(c => c.type === ChannelType.GUILD_CATEGORY).sort((a, b) => a.position - b.position);
        const categoryOrder = new Map(categories.map((c, i) => [c.id, i]));
        const channels = all
            .filter(c => c.type !== ChannelType.GUILD_CATEGORY && channelBodyType(c.type) !== null)
            .sort((a, b) =>
                (categoryOrder.get(a.parent_id) ?? -1) - (categoryOrder.get(b.parent_id) ?? -1)
                || a.position - b.position);

        const converted = channels.filter(c => c.type !== ChannelType.GUILD_TEXT && c.type !== ChannelType.GUILD_VOICE).length;
        if (converted) notes.push(t("{n} announcement/stage/forum/media channel(s) became ordinary text or voice channels (those types need Community).", { n: converted }));
        const skippedThreads = all.length - categories.length - channels.length;
        if (skippedThreads > 0) notes.push(t("{n} channel(s) of an unsupported type were skipped.", { n: skippedThreads }));

        // ---- the new server ----
        progress("creating the server");
        const iconUrl = source.icon ? `https://cdn.discordapp.com/icons/${source.id}/${source.icon}.png?size=1024` : null;
        const icon = iconUrl ? await toDataUrl(iconUrl) : null;
        if (iconUrl && !icon) notes.push(t("The icon could not be downloaded."));

        const created = await call<{ id: string; }>("post", "/guilds", { name: source.name, icon, channels: [], system_channel_id: null });
        newGuildId = created.id;
        roleMap.set(source.id, newGuildId);

        // A new server comes with a few default channels, remove them so the copy is exact.
        await pause();
        const defaults = await call<{ id: string; }[]>("get", `/guilds/${newGuildId}/channels`);
        for (const ch of defaults ?? []) {
            await call("del", `/channels/${ch.id}`);
            await pause();
        }

        // ---- @everyone ----
        if (everyone) {
            await call("patch", `/guilds/${newGuildId}/roles/${newGuildId}`, { permissions: String(everyone.permissions) });
            await pause();
        }

        // ---- roles ----
        for (const [i, role] of roles.entries()) {
            progress(t("roles {i} of {n}", { i: i + 1, n: roles.length }));
            try {
                const made = await call<{ id: string; }>("post", `/guilds/${newGuildId}/roles`, {
                    name: role.name,
                    permissions: String(role.permissions),
                    color: role.color,
                    hoist: role.hoist,
                    mentionable: role.mentionable
                });
                roleMap.set(role.id, made.id);
                stats.roles++;
            } catch (err) {
                if (err instanceof Cancelled || err instanceof RateLimited) throw err;
                notes.push(t('Role "{name}" failed: {error}', { name: role.name, error: errorText(err) }));
            }
            await pause();
        }
        if (roleMap.size > 2) {
            // Roles are created at the bottom, put them back in the original order.
            const positions = roles.filter(r => roleMap.has(r.id)).map((r, i) => ({ id: roleMap.get(r.id)!, position: i + 1 }));
            try {
                await call("patch", `/guilds/${newGuildId}/roles`, positions);
            } catch (err) {
                if (err instanceof Cancelled) throw err;
                notes.push(t("Role order could not be restored: {error}", { error: errorText(err) }));
            }
            await pause();
        }

        const overwritesFor = (ch: { permissionOverwrites: Record<string, { id: string; type: number; allow: bigint; deny: bigint; }>; }) => {
            const out: { id: string; type: number; allow: string; deny: string; }[] = [];
            for (const ow of Object.values(ch.permissionOverwrites ?? {})) {
                if (ow.type !== 0) continue; // member overwrites need the member to be in the new server
                const mapped = roleMap.get(ow.id);
                if (mapped) out.push({ id: mapped, type: 0, allow: String(ow.allow), deny: String(ow.deny) });
            }
            return out;
        };

        // ---- categories, then channels ----
        for (const [i, cat] of categories.entries()) {
            progress(t("categories {i} of {n}", { i: i + 1, n: categories.length }));
            try {
                const made = await call<{ id: string; }>("post", `/guilds/${newGuildId}/channels`, {
                    type: ChannelType.GUILD_CATEGORY,
                    name: cat.name,
                    permission_overwrites: overwritesFor(cat)
                });
                channelMap.set(cat.id, made.id);
                stats.categories++;
            } catch (err) {
                if (err instanceof Cancelled || err instanceof RateLimited) throw err;
                notes.push(t('Category "{name}" failed: {error}', { name: cat.name, error: errorText(err) }));
            }
            await pause();
        }

        for (const [i, ch] of channels.entries()) {
            progress(t("channels {i} of {n}", { i: i + 1, n: channels.length }));
            const type = channelBodyType(ch.type)!;
            const body: Record<string, unknown> = {
                type,
                name: ch.name,
                permission_overwrites: overwritesFor(ch)
            };
            const parent = channelMap.get(ch.parent_id);
            if (parent) body.parent_id = parent;
            if (type === ChannelType.GUILD_TEXT) {
                if (ch.topic) body.topic = ch.topic;
                body.nsfw = !!ch.nsfw;
                if (ch.rateLimitPerUser) body.rate_limit_per_user = ch.rateLimitPerUser;
            } else {
                if (ch.bitrate) body.bitrate = Math.min(Math.max(ch.bitrate, 8000), MAX_BITRATE);
                if (ch.userLimit) body.user_limit = ch.userLimit;
            }
            try {
                const made = await call<{ id: string; }>("post", `/guilds/${newGuildId}/channels`, body);
                channelMap.set(ch.id, made.id);
                stats.channels++;
            } catch (err) {
                if (err instanceof Cancelled || err instanceof RateLimited) throw err;
                notes.push(t('Channel "{name}" failed: {error}', { name: ch.name, error: errorText(err) }));
            }
            await pause();
        }

        // ---- server settings ----
        progress("settings");
        const settingsBody: Record<string, unknown> = {
            verification_level: source.verificationLevel,
            default_message_notifications: source.defaultMessageNotifications,
            explicit_content_filter: source.explicitContentFilter,
            preferred_locale: source.preferredLocale,
            system_channel_flags: source.systemChannelFlags,
            afk_timeout: source.afkTimeout
        };
        const system = source.systemChannelId && channelMap.get(source.systemChannelId);
        if (system) settingsBody.system_channel_id = system;
        const afk = source.afkChannelId && channelMap.get(source.afkChannelId);
        if (afk) settingsBody.afk_channel_id = afk;
        try {
            await call("patch", `/guilds/${newGuildId}`, settingsBody);
        } catch (err) {
            if (err instanceof Cancelled) throw err;
            notes.push(t("Server settings could not be copied: {error}", { error: errorText(err) }));
        }
        await pause();

        if (source.banner) {
            // Banners need Boost level 2, which a brand new server does not have. Try once, it costs nothing.
            const banner = await toDataUrl(`https://cdn.discordapp.com/banners/${source.id}/${source.banner}.png?size=1024`);
            let ok = false;
            if (banner) {
                try {
                    await call("patch", `/guilds/${newGuildId}`, { banner });
                    ok = true;
                } catch (err) {
                    if (err instanceof Cancelled) throw err;
                }
            }
            if (!ok) notes.push(t("The banner was not copied: a new server needs Boost level 2 to have one."));
            await pause();
        }

        // ---- emojis ----
        if (settings.store.copyEmojis) {
            const emojis = EmojiStore.getGuildEmoji(source.id);
            const statics = emojis.filter(e => !e.animated).slice(0, MAX_STATIC_EMOJI);
            const animated = emojis.filter(e => e.animated).slice(0, MAX_ANIMATED_EMOJI);
            const list = [...statics, ...animated];
            if (emojis.length > list.length) notes.push(t("{n} emoji(s) did not fit in the free slots of a new server.", { n: emojis.length - list.length }));
            let failed = 0;
            for (const [i, emoji] of list.entries()) {
                progress(t("emojis {i} of {n}", { i: i + 1, n: list.length }));
                try {
                    const image = await toDataUrl(`https://cdn.discordapp.com/emojis/${emoji.id}.${emoji.animated ? "gif" : "png"}?size=128`);
                    if (!image) { failed++; continue; }
                    await call("post", `/guilds/${newGuildId}/emojis`, { name: emoji.name, image });
                    stats.emojis++;
                } catch (err) {
                    if (err instanceof Cancelled) throw err;
                    if (err instanceof RateLimited) {
                        notes.push(t("Emoji copying stopped early: {error}. {done} of {total} were copied.", { error: err.message, done: stats.emojis, total: list.length }));
                        failed = 0;
                        break;
                    }
                    failed++;
                }
                await pause();
            }
            if (failed) notes.push(t("{n} emoji(s) could not be copied.", { n: failed }));
        }

        Toasts.show({ id: toastId, type: Toasts.Type.SUCCESS, message: t('Cloned "{name}"', { name: source.name }) });
        Alerts.show({
            title: t("Server cloned"),
            body: [
                settings.store.copyEmojis
                    ? t('"{name}" was copied to a new server on your account: {roles} roles, {categories} categories, {channels} channels, {emojis} emojis.', { name: source.name, roles: stats.roles, categories: stats.categories, channels: stats.channels, emojis: stats.emojis })
                    : t('"{name}" was copied to a new server on your account: {roles} roles, {categories} categories, {channels} channels.', { name: source.name, roles: stats.roles, categories: stats.categories, channels: stats.channels }),
                t("Messages, members, bots, webhooks, stickers and invites are not copied."),
                ...notes
            ].join("\n\n"),
            confirmText: t("OK"),
            cancelText: ""
        });
    } catch (err: any) {
        if (err instanceof Cancelled) {
            Toasts.show({ id: toastId, type: Toasts.Type.MESSAGE, message: t("Server clone cancelled") });
            Alerts.show({
                title: t("Server clone cancelled"),
                body: newGuildId
                    ? t("Stopped part of the way. The half-built server is still on your account, delete it if you do not want it.")
                    : t("Stopped part of the way. Nothing was created."),
                confirmText: t("OK"),
                cancelText: ""
            });
        } else {
            Toasts.show({ id: toastId, type: Toasts.Type.FAILURE, message: t("Server clone failed") });
            Alerts.show({
                title: t("Server clone failed"),
                body: newGuildId
                    ? t("{error}. A partly built server may be left on your account, delete it if you do not want it.", { error: errorText(err) })
                    : t("{error}. Nothing was created.", { error: errorText(err) }),
                confirmText: t("OK"),
                cancelText: ""
            });
        }
    } finally {
        job = null;
    }
}

function startClone(source: Guild) {
    if (job) return;

    const roles = GuildRoleStore.getSortedRoles(source.id).filter(r => r.id !== source.id && !r.managed).length;
    const all = Object.values(ChannelStore.getMutableGuildChannelsForGuild(source.id)).filter(c => channelBodyType(c.type) !== null).length;
    const emojis = settings.store.copyEmojis ? Math.min(EmojiStore.getGuildEmoji(source.id).length, MAX_STATIC_EMOJI + MAX_ANIMATED_EMOJI) : 0;
    const calls = roles + all + emojis + 10;

    Alerts.show({
        title: t('Clone "{name}"?', { name: source.name }),
        body: [
            settings.store.copyEmojis
                ? t("This creates a NEW server on your account with the same name, icon, roles, role permissions, categories, channels and channel permissions, and emojis. {roles} roles and {channels} channels will be copied, {eta}.", { roles, channels: all, eta: etaText(calls) })
                : t("This creates a NEW server on your account with the same name, icon, roles, role permissions, categories, channels and channel permissions. {roles} roles and {channels} channels will be copied, {eta}.", { roles, channels: all, eta: etaText(calls) }),
            t("Only what you can see is copied. Messages, members, bots, webhooks, stickers and invites are not, and the banner needs Boost level 2."),
            t("It sends a lot of requests from your account. Discord's terms do not allow client mods or automation, so this is at your own risk. Do not use it to copy someone else's server to pass it off as theirs.")
        ].join("\n\n"),
        confirmText: t("Clone"),
        cancelText: t("Cancel"),
        onConfirm() {
            if (job) return;
            job = { source, cancelled: false };
            runClone(job);
        }
    });
}

const guildContextPatch: NavContextMenuPatchCallback = (children, { guild }: { guild?: Guild; }) => {
    if (!guild) return;
    const group = findGroupChildrenByChildId("privacy", children) ?? children;

    if (job) {
        group.push(
            <Menu.MenuItem
                id="vc-server-cloner-cancel"
                label={t("Cancel server clone")}
                color="danger"
                action={() => { if (job) job.cancelled = true; }}
            />
        );
        return;
    }

    group.push(
        <Menu.MenuItem
            id="vc-server-cloner"
            label={t("Clone server")}
            action={() => startClone(guild)}
        />
    );
};

export default definePlugin({
    name: "ServerCloner",
    description: "Right click a server and pick \"Clone server\" to copy its name, icon, roles, permissions, categories, channels and emojis into a new server of your own. It sends many requests from your account, which Discord's terms do not allow for client mods, so use it at your own risk.",
    tags: ["Servers", "Utility"],
    authors: [Devs.Tsar],
    searchTerms: ["guild", "copy", "duplicate", "template", "backup"],
    settings,

    contextMenus: {
        "guild-context": guildContextPatch
    },

    stop() {
        if (job) job.cancelled = true;
    }
});
