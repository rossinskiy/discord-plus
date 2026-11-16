/*
 * Vencord, a Discord client mod
 * Copyright (c) 2026 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import "./style.css";

import { addProfileBadge, BadgePosition, BadgeUserArgs, ProfileBadge, removeProfileBadge } from "@api/Badges";
import { Devs } from "@utils/constants";
import definePlugin from "@utils/types";
import { findStoreLazy } from "@webpack";
import { FluxDispatcher, GuildMemberStore, UserStore } from "@webpack/common";

import {
    cachedOfficialBadges, cachedProfile, clearBadgeCache, configureRemote, loadLocalBadges, loadSelf, localBadges, officialById,
    registerSelf, requestBadges, subscribe, uidBadgeInfo
} from "./badges";
import { DEFAULT_SERVER, settings } from "./settings";

// Discord's "Your badges" window reads its list from BadgeDirectoryStore. The patch below makes that store
// also return the Discord+ badges (and, for yourself, your own local badges), so they show up in the window
// next to Discord's own. Entries are cached so React sees the same objects until something really changes.
const BadgeDirectoryStore = findStoreLazy("BadgeDirectoryStore");
const catalogCache = new Map<string, any>();
let stopCatalogSync: (() => void) | undefined;

function catalogEntry(id: string, name: string, description: string, icon: string) {
    const key = `${id}|${name}|${description}|${icon.length}`;
    let entry = catalogCache.get(key);
    if (!entry) {
        entry = {
            badge_id: id,
            name,
            description,
            owned: true,
            is_earnable: false,
            has_updates: false,
            tiers: [],
            progress: [],
            simple_icon_url: icon,
            complex_icon_static_url: icon,
            complex_icon_animated_url: undefined
        };
        catalogCache.set(key, entry);
    }
    return entry;
}

function catalogBadgesFor(userId: string | undefined): any[] {
    if (!userId) return [];
    const out: any[] = [];
    const { ids, uid, joined } = cachedProfile(userId);
    for (const id of ids) {
        const b = officialById(id);
        if (b) out.push(catalogEntry(`discordplus-${b.id}`, b.name, b.description, b.icon));
    }
    if (uid) {
        const info = uidBadgeInfo(uid, joined);
        out.push(catalogEntry("discordplus-member", `Discord+ #${uid}`, info.description, info.icon));
    }
    if (userId === myId()) {
        for (const b of localBadges) out.push(catalogEntry(b.id, b.name, b.description, b.image));
    }
    return out;
}

// UserStore.getCurrentUser() ends up calling getUser(), which this plugin wraps, so the id has to be
// looked up with a guard against calling itself and then remembered.
let cachedId = "";
let looking = false;
let originalCurrentUser: (() => { id: string; } | undefined) | undefined;

function myId() {
    if (cachedId) return cachedId;
    if (looking) return "";
    looking = true;
    try {
        cachedId = (originalCurrentUser ?? (() => UserStore.getCurrentUser()))()?.id ?? "";
    } catch { } finally {
        looking = false;
    }
    return cachedId;
}

const isMe = (userId: string) => !!userId && userId === myId();

const localBadgeFor = (position: "start" | "end"): ProfileBadge => ({
    id: `myprofile-local-${position}`,
    position: position === "start" ? BadgePosition.START : BadgePosition.END,
    shouldShow: ({ userId }: BadgeUserArgs) => isMe(userId),
    getBadges: () => localBadges
        .filter(b => b.position === position)
        .map(b => ({ id: b.id, key: b.id, description: b.description, iconSrc: b.image }))
});

const startBadges = localBadgeFor("start");
const endBadges = localBadgeFor("end");

const officialBadges: ProfileBadge = {
    id: "myprofile-official",
    position: BadgePosition.START,
    shouldShow: () => true,
    getBadges: ({ userId }: BadgeUserArgs) => cachedOfficialBadges(userId)
        .map(officialById)
        .filter(b => !!b)
        .map(b => ({ id: `discordplus-${b!.id}`, key: `discordplus-${b!.id}`, description: b!.description, iconSrc: b!.icon }))
};

// The member number badge, drawn last. Its colour shows how early the person joined.
const uidBadge: ProfileBadge = {
    id: "myprofile-uid",
    position: BadgePosition.END,
    shouldShow: () => true,
    getBadges: ({ userId }: BadgeUserArgs) => {
        const { uid, joined } = cachedProfile(userId);
        if (!uid) return [];
        const info = uidBadgeInfo(uid, joined);
        return [{ id: `discordplus-uid-${uid}`, key: `discordplus-uid-${uid}`, description: info.description, iconSrc: info.icon }];
    }
};

// Wraps a store method for the lifetime of the plugin and puts the original back afterwards.
const restorers: (() => void)[] = [];
function wrap(store: any, method: string, make: (original: (...args: any[]) => any) => (...args: any[]) => any) {
    const original = store?.[method];
    if (typeof original !== "function") return;
    const hadOwn = Object.prototype.hasOwnProperty.call(store, method);
    store[method] = make(original.bind(store));
    restorers.push(() => {
        if (hadOwn) store[method] = original;
        else delete store[method];
    });
}

const customName = () => settings.store.customName.trim();
const customUsername = () => settings.store.customUsername.trim().replace(/^@/, "");
const overriding = () => !!(customName() || customUsername());

// Only you ever see this, since it just changes what your own client shows for your own account.
function installNameOverride() {
    // Nothing to override, so leave the stores completely alone.
    if (!overriding()) return;

    originalCurrentUser = UserStore.getCurrentUser.bind(UserStore);
    cachedId = "";

    wrap(GuildMemberStore, "getNick", original => (guildId: string, userId: string) =>
        customName() && isMe(userId) ? customName() : original(guildId, userId));

    wrap(GuildMemberStore, "getMember", original => (guildId: string, userId: string) => {
        const member = original(guildId, userId);
        return member && customName() && isMe(userId) ? { ...member, nick: customName() } : member;
    });

    const withName = (user: any) => {
        if (!user || !overriding() || !isMe(user.id)) return user;
        const props: PropertyDescriptorMap = {};
        if (customName()) props.globalName = { value: customName() };
        if (customUsername()) props.username = { value: customUsername() };
        return Object.create(user, props);
    };


    wrap(UserStore, "getUser", original => (id: string) => withName(original(id)));
    wrap(UserStore, "getCurrentUser", original => () => withName(original()));
}

function joinList() {
    const id = UserStore.getCurrentUser()?.id;
    if (id) registerSelf(id);
}

const onMessages = ({ messages }: { messages?: { author?: { id: string; }; }[]; }) =>
    requestBadges((messages ?? []).map(m => m.author?.id).filter(Boolean) as string[]);
const onMessage = ({ message }: { message?: { author?: { id: string; }; }; }) =>
    message?.author?.id && requestBadges([message.author.id]);

export default definePlugin({
    name: "MyProfile",
    authors: [Devs.Tsar],
    description: "Put your own badges and display name on your profile, visible only to you, and show Discord+ badges (handed out by the server owner) on other Discord+ users.",
    tags: ["Appearance", "Customisation"],
    required: true,
    settings,

    patches: [
        {
            // Only the "Your badges" window gets the extra entries. The store itself stays untouched, because
            // the profile editor builds its saved badge order from the same store and Discord would reject ids it does not know.
            find: 'location:"BadgeDirectoryPanel"',
            replacement: [
                {
                    match: /(\i\.Ay\.getBadges\((\i)\))(?=:\[\],\[\])/g,
                    replace: "$self.withCatalogBadges($1,$2)"
                },
                {
                    match: /(\i\.Ay\.getBadgeById\((\i),(\i)\))(?=:void 0)/g,
                    replace: "($1??$self.catalogBadgeById($2,$3))"
                }
            ]
        },
        {
            // The "Customize your badges" popout lists Discord's badges. Show ours there too, as plain
            // icons without the hide/reorder menu, since Discord cannot save badges it does not know.
            find: 'location:"BadgeCustomizationPopout"',
            replacement: {
                match: /className:\i\(\)\((\i)\.yq,\i&&\i\.T0\),role:"group",.{0,80}?children:\[/,
                replace: "$&$self.customBadgesRow($1),"
            }
        }
    ],

    customBadgesRow(styles: Record<string, string>) {
        try {
            return catalogBadgesFor(myId()).map(b => (
                <div key={b.badge_id} className={styles.fw} title={b.name}>
                    <div className={styles.yk}>
                        <img src={b.simple_icon_url} alt={b.name} draggable={false} className={styles.pC} />
                    </div>
                </div>
            ));
        } catch {
            return null;
        }
    },

    withCatalogBadges(list: any[], userId?: string) {
        try {
            const extra = catalogBadgesFor(userId ?? myId());
            return extra.length ? [...list, ...extra] : list;
        } catch {
            return list;
        }
    },

    catalogBadgeById(badgeId: string, userId?: string) {
        try {
            return catalogBadgesFor(userId ?? myId()).find(b => b.badge_id === badgeId);
        } catch {
            return undefined;
        }
    },

    async start() {
        await loadLocalBadges();
        await loadSelf();
        configureRemote(DEFAULT_SERVER, true);

        addProfileBadge(startBadges);
        addProfileBadge(endBadges);
        addProfileBadge(officialBadges);
        addProfileBadge(uidBadge);
        stopCatalogSync = subscribe(() => { try { BadgeDirectoryStore.emitChange?.(); } catch { } });

        installNameOverride();

        FluxDispatcher.subscribe("LOAD_MESSAGES_SUCCESS", onMessages);
        FluxDispatcher.subscribe("MESSAGE_CREATE", onMessage);
        FluxDispatcher.subscribe("CONNECTION_OPEN", joinList);
        joinList();
    },

    stop() {
        removeProfileBadge(startBadges);
        removeProfileBadge(endBadges);
        removeProfileBadge(officialBadges);
        removeProfileBadge(uidBadge);
        stopCatalogSync?.();

        FluxDispatcher.unsubscribe("LOAD_MESSAGES_SUCCESS", onMessages);
        FluxDispatcher.unsubscribe("MESSAGE_CREATE", onMessage);
        FluxDispatcher.unsubscribe("CONNECTION_OPEN", joinList);

        while (restorers.length) restorers.pop()!();
        cachedId = "";
        originalCurrentUser = undefined;
        clearBadgeCache();
    }
});
