/*
 * Vencord, a Discord client mod
 * Copyright (c) 2026 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

/*
 * Local answers for REST routes that exist for users but not for bots.
 * DiscordBotClient serves ~134 of these from an Express server (src/AppCore/routes);
 * this is the renderer-side port of the ones the client needs to stay usable. Add more as they show up in the console.
 */

import { UserStore } from "@webpack/common";

type Original = (opts: any) => Promise<any>;
export type StubResult = { status: number; body: unknown; };
type Handler = (opts: any, original: Original) => Promise<StubResult>;

interface Route {
    re: RegExp;
    methods?: string[]; // all methods when omitted
    handler: Handler;
}

const routes: Route[] = [];

function stub(re: RegExp, body: unknown | (() => unknown), status = 200, methods?: string[]) {
    routes.push({ re, methods, handler: async () => ({ status, body: typeof body === "function" ? (body as () => unknown)() : body }) });
}

const GET = ["GET"];
const FORBIDDEN = { message: "BotClient: Bots cannot use this endpoint", code: 20001 };
const commandIndex = () => ({ applications: [], application_commands: [], version: String(BigInt(Date.now() - 1420070400000) << 22n) });

// ---- dynamic routes (real data, reshaped) ----

const botId = () => UserStore.getCurrentUser()?.id;

routes.push({
    re: /^\/users\/@me$/, methods: GET,
    handler: async (opts, original) => {
        const res = await original(opts);
        return {
            status: 200,
            body: {
                ...res.body, premium: true, premium_type: 2, mfa_enabled: true, phone: "33550336",
                verified: true, nsfw_allowed: true, purchased_flags: 3, email: `${res.body.id}@bot.invalid`,
            },
        };
    },
});

// custom endpoint: Application Emojis of the bot
routes.push({
    re: /^\/users\/@me\/emojis$/, methods: GET,
    handler: async (_opts, original) => {
        const id = botId();
        if (!id) return { status: 200, body: [] };
        try {
            const res = await original({ url: `/applications/${id}/emojis` });
            return { status: 200, body: res.body?.items ?? [] };
        } catch {
            return { status: 200, body: [] };
        }
    },
});

routes.push({
    re: /^\/users\/(@me|%40me|\d+)\/profile$/, methods: GET,
    handler: async (_opts, original) => {
        const m = /^\/users\/(@me|%40me|\d+)\/profile$/.exec(_opts.url.split("?")[0])!;
        const id = m[1].length > 5 ? m[1] : botId();
        const { body: user } = await original({ url: `/users/${id}` });
        return {
            status: 200,
            body: {
                user,
                connected_accounts: [],
                premium_since: null,
                premium_type: null,
                premium_guild_since: null,
                profile_themes_experiment_bucket: 0,
                user_profile: { bio: user.bio ?? "", accent_color: user.accent_color ?? null, pronouns: "", theme_colors: null, popout_animation_particle_type: null, emoji: null, profile_effect: null },
                badges: [],
                guild_badges: [],
                mutual_guilds: [],
                mutual_friends_count: 0,
                legacy_username: null,
            },
        };
    },
});

routes.push({
    re: /^\/guilds\/\d+\/profile$/, methods: GET,
    handler: async (opts, original) => {
        const id = opts.url.split("?")[0].split("/")[2];
        try {
            const { body: g } = await original({ url: `/guilds/${id}`, query: { with_counts: true } });
            return {
                status: 200,
                body: {
                    id: g.id, name: g.name, icon_hash: g.icon, member_count: g.approximate_member_count,
                    online_count: g.approximate_presence_count, description: g.description, banner_hash: g.banner,
                    game_application_ids: [], game_activity: {}, tag: null, badge: 0, badge_color_primary: "#ff0000",
                    badge_color_secondary: "#800000", badge_hash: null, traits: [], features: g.features, visibility: 2,
                    custom_banner_hash: null, premium_subscription_count: g.premium_subscription_count, premium_tier: g.premium_tier,
                },
            };
        } catch {
            return { status: 403, body: FORBIDDEN };
        }
    },
});

// ---- plain stubs ----

stub(/^\/users\/@me\/relationships$/, []);
stub(/^\/users\/@me\/connections$/, []);
stub(/^\/users\/@me\/mentions/, []);
stub(/^\/users\/@me\/consent$/, { personalization: { consented: false }, usage_statistics: { consented: false } });
stub(/^\/users\/@me\/survey$/, null, 200);
stub(/^\/users\/@me\/harvest$/, null, 200, GET);
stub(/^\/users\/@me\/harvest$/, FORBIDDEN, 403, ["POST"]);
stub(/^\/users\/@me\/saved-messages\/bookmarks$/, { results: [], has_more: false });
stub(/^\/users\/@me\/saved-messages/, { reminders: [], bookmark_ids: [], results: [] });
stub(/^\/users\/@me\/affinities\/guilds$/, { guild_affinities: [] });
stub(/^\/users\/@me\/affinities\/users$/, { user_affinities: [], inverse_user_affinities: [] });
stub(/^\/users\/@me\/avatars$/, { avatars: [] });
stub(/^\/users\/@me\/email-settings$/, { categories: { social: true, communication: true, recommendations_and_events: false, tips: false, updates_and_announcements: false }, initialized: true });
stub(/^\/users\/@me\/notification-center\/items$/, () => ({ limit: 20, items: [], cursor: "0", has_more: false }));
stub(/^\/users\/@me\/program-rewards$/, { rewards: [] });
stub(/^\/users\/@me\/gift-intent-dismissals$/, { dismissals: [] });
stub(/^\/users\/@me\/virtual-currency\/balance$/, { balance: 0 });
stub(/^\/users\/@me\/custom-themes$/, null, 204);
stub(/^\/users\/@me\/meaningfully-online$/, null, 204);
stub(/^\/users\/@me\/application-command-index$/, commandIndex);
stub(/^\/(users\/[^/]+|guilds\/\d+|channels\/\d+)\/application-command-index$/, commandIndex);
stub(/^\/channels\/\d+\/application-commands\/search$/, { application_commands: [], applications: [], cursor: null });
stub(/^\/users\/@me\/applications\/\d+\/entitlements$/, []);
stub(/^\/users\/@me\/(entitlements(\/gifts)?|inventory|library|video-filters\/assets|outbound-promotions\/codes|mfa\/webauthn\/credentials|collectibles-purchases|guilds\/premium\/(subscription-slots|subscriptions))$/, []);
stub(/^\/users\/@me\/(guilds\/integration-application-ids|unclaimed-games)$/, {});
stub(/^\/users\/@me\/collectibles-marketing$/, { marketings: {} });
stub(/^\/users\/@me\/activities\/statistics\/applications$/, []);
stub(/^\/users\/@me\/widgets\/application-widget-application-ids$/, { application_configs: [] });
stub(/^\/users\/@me\/widgets\/suggested-games$/, { suggested_games: [], suggested_wishlist_games: [] });
stub(/^\/users\/@me\/referrals\/eligibility$/, { referrals_remaining: 0, sent_user_ids: [], refresh_at: null, has_eligible_friends: true, recipient_status: {}, is_eligible_for_incentive: false, is_qualified_for_incentive: false, referral_incentive_status: 0 });
stub(/^\/users\/@me\/referrals\/eligible-users$/, { users: [], next_index: 0 });
stub(/^\/users\/@me\/referrals\/[^/]+\/preview$/, { is_eligible: false });
stub(/^\/users\/@me\/billing\/(payment-sources|payments|nitro-affinity|subscriptions)$/, []);
stub(/^\/users\/@me\/billing\/country-code$/, { country_code: "US" });
stub(/^\/users\/@me\/billing\/location-info$/, { country_code: "US", subdivision_code: "CA" });
stub(/^\/users\/@me\/billing\/campaign-context$/, [{ campaign: 2, is_eligible: false }]);
stub(/^\/users\/@me\/billing\/subscriptions\/[^/]+\/reward-eligibility$/, { eligible: 0 });
stub(/^\/users\/\d+\/application-identities$/, { identities: [] });
stub(/^\/family-center\/@me$/, { linked_users: [], users: [], teen_audit_log: null, age_group: "adult" });
stub(/^\/safety-hub\/@me$/, { classifications: [], guild_classifications: [], account_standing: { state: 100 } });
stub(/^\/read-states\/ack-bulk$/, null);
stub(/^\/channels\/\d+\/messages\/\d+\/ack$/, { token: null });
stub(/^\/channels\/\d+\/explicit-media$/, null, 204, ["PATCH"]);
stub(/^\/channels\/\d+\/polls\/\d+\/answers\/@me$/, { message: "BotClient: Apps are not allowed to vote on polls.", code: 520000 }, 403, ["PUT"]);
stub(/^\/guilds\/\d+\/members\/@me$/, { message: "BotClient: User is not eligible to join this server.", code: 150023 }, 403, ["PUT"]);
stub(/^\/auth\/location-metadata$/, { consent_required: false, country_code: "US", promotional_email_opt_in: { required: true, pre_checked: false } });
stub(/^\/auth\/logout$/, null, 204);
stub(/^\/auth\/sessions$/, { user_sessions: [] });
stub(/^\/experiments$/, { fingerprint: "", assignments: [], guild_experiments: [] });
stub(/^\/(app-recommendations|applications\/non-games\/detectable|games|collectibles-categories|collectibles-purchases|outbound-promotions|premium-marketing|teams|oauth2\/tokens|store\/published-listings\/skus|store\/published-listings\/(skus|applications)\/\d+\/subscription-plans)$/, []);
stub(/^\/(activities\/shelf|applications-with-assets)$/, { activities: [], applications: [], assets: {} });
stub(/^\/collectibles-categories\/v2$/, { categories: [], collections: [] });
stub(/^\/collectibles-(marketing)$/, { marketings: {} });
stub(/^\/collectibles-shop$/, { shop_blocks: [], categories: [] });
stub(/^\/storefront\/promotions$/, { promotions: [] });
stub(/^\/partner-sdk\/storefront-config$/, { promotional_sku_ids: [], promotion_end_datetime: null });
stub(/^\/discoverable-guilds$/, { total: 0, guilds: [], offset: 0, limit: 100 });
stub(/^\/discoverable-guilds\/search$/, { guilds: [], total_count: 0, categories: [] });
stub(/^\/quests\/@me$/, { quests: [], excluded_quests: [], quest_enrollment_blocked_until: null });
stub(/^\/quests\/@me\/claimed$/, { quests: [] });
stub(/^\/quests\/decision$/, { quest: null });
stub(/^\/quests\/get-decisions$/, () => ({ request_id: crypto.randomUUID(), decisions: [] }));
stub(/^\/quests\/[^/]+/, FORBIDDEN, 403);
stub(/^\/streams\/[^/]+\/preview$/, FORBIDDEN, 403);
stub(/^\/content-inventory\/users\/(@me|\d+)\/outbox$/, { entries: [] });
stub(/^\/creator-monetization\/marketing\/nag-activate\/eligibility$/, { eligible_guilds: [] });
stub(/^\/hypesquad\/online$/, null);
stub(/^\/guilds\/integration-application-ids$/, {});
stub(/^\/guilds\/premium\/subscription-slots$/, []);
stub(/^\/guilds\/\d+\/(applications|entitlements|powerups|role-subscriptions\/(group-listings|trials)|premium\/subscriptions)$/, []);
stub(/^\/guilds\/\d+\/admin-server-eligibility$/, { eligible_for_admin_server: false });
stub(/^\/guilds\/\d+\/analytics\/member-insights$/, { has_access_rate: false, access_rate: null, last_updated: null });
stub(/^\/guilds\/\d+\/migrate-command-scope$/, { integration_ids_with_app_commands: [] });
stub(/^\/guilds\/\d+\/products\/listings$/, { listings: [] });
stub(/^\/guilds\/\d+\/top-emojis$/, { items: [] });
stub(/^\/guilds\/\d+\/top-games$/, { top_games: [] });
stub(/^\/guilds\/\d+\/onboarding-responses$/, []);

const BLACKLIST = [
    "outbound-promotions/codes", "science", "applications/public", "notes", "member-ids", "connections/",
    "users/@me/disable", "users/@me/delete", "users/@me/mfa", "users/@me/phone", "interaction-data",
    "member-verification", "cdn-cgi/challenge-platform", "explicit-media", "premium/subscriptions", "/ack",
    "/stripe", "/paypal", "/validate-billing-address", "/custom-call-sounds", "auth/conditional/start",
];

function normalize(path: string) {
    return path.replace(/^(?:https:\/\/[^/]+)?\/api\/v\d+/, "");
}

export function matchStub(path: string, method: string) {
    const p = normalize(path);
    return routes.find(r => r.re.test(p) && (!r.methods || r.methods.includes(method)))?.handler;
}

export function blacklistedRoute(path: string) {
    const p = normalize(path);
    return BLACKLIST.some(b => p.includes(b));
}
