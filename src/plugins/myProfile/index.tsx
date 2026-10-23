/*
 * Vencord, a Discord client mod
 * Copyright (c) 2026 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import "./style.css";

import { addProfileBadge, BadgePosition, BadgeUserArgs, ProfileBadge, removeProfileBadge } from "@api/Badges";
import { Devs } from "@utils/constants";
import definePlugin from "@utils/types";
import { FluxDispatcher, GuildMemberStore, UserStore } from "@webpack/common";

import {
    cachedOfficialBadges, clearBadgeCache, configureRemote, loadLocalBadges, localBadges, officialById, requestBadges
} from "./badges";
import { settings } from "./settings";

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
    shouldShow: () => settings.store.showOfficialBadges,
    getBadges: ({ userId }: BadgeUserArgs) => cachedOfficialBadges(userId)
        .map(officialById)
        .filter(b => !!b)
        .map(b => ({ id: `discordplus-${b!.id}`, key: `discordplus-${b!.id}`, description: b!.description, iconSrc: b!.icon }))
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

// Only you ever see this, since it just changes what your own client shows for your own account.
function installNameOverride() {
    // Nothing to override, so leave the stores completely alone.
    if (!customName()) return;

    originalCurrentUser = UserStore.getCurrentUser.bind(UserStore);
    cachedId = "";

    wrap(GuildMemberStore, "getNick", original => (guildId: string, userId: string) =>
        customName() && isMe(userId) ? customName() : original(guildId, userId));

    wrap(GuildMemberStore, "getMember", original => (guildId: string, userId: string) => {
        const member = original(guildId, userId);
        return member && customName() && isMe(userId) ? { ...member, nick: customName() } : member;
    });

    const withName = (user: any) =>
        user && customName() && isMe(user.id) ? Object.create(user, { globalName: { value: customName() } }) : user;


    wrap(UserStore, "getUser", original => (id: string) => withName(original(id)));
    wrap(UserStore, "getCurrentUser", original => () => withName(original()));
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
    settings,

    async start() {
        await loadLocalBadges();
        configureRemote(settings.store.serverUrl, settings.store.showOfficialBadges);

        addProfileBadge(startBadges);
        addProfileBadge(endBadges);
        addProfileBadge(officialBadges);

        installNameOverride();

        FluxDispatcher.subscribe("LOAD_MESSAGES_SUCCESS", onMessages);
        FluxDispatcher.subscribe("MESSAGE_CREATE", onMessage);
    },

    stop() {
        removeProfileBadge(startBadges);
        removeProfileBadge(endBadges);
        removeProfileBadge(officialBadges);

        FluxDispatcher.unsubscribe("LOAD_MESSAGES_SUCCESS", onMessages);
        FluxDispatcher.unsubscribe("MESSAGE_CREATE", onMessage);

        while (restorers.length) restorers.pop()!();
        cachedId = "";
        originalCurrentUser = undefined;
        clearBadgeCache();
    }
});
