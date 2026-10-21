/*
 * Vencord, a Discord client mod
 * Copyright (c) 2026 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { ApplicationCommandInputType, ApplicationCommandOptionType, findOption, sendBotMessage } from "@api/Commands";
import { NavContextMenuPatchCallback } from "@api/ContextMenu";
import { showNotification } from "@api/Notifications";
import { ClockIcon } from "@components/Icons";
import { Devs } from "@utils/constants";
import definePlugin from "@utils/types";
import type { Message } from "@vencord/discord-types";
import { ChannelStore, Menu, showToast, Toasts } from "@webpack/common";

import { addReminder, loadReminders, Reminder, startChecking, stopChecking } from "./api";
import { parseDuration } from "./parseDuration";
import { openRemindModal } from "./RemindModal";
import { settings } from "./settings";

function excerpt(content: string | undefined): string {
    if (!content) return "Reminder";
    const oneLine = content.replace(/\s+/g, " ").trim();
    return oneLine.length > 80 ? oneLine.slice(0, 77) + "..." : oneLine || "Reminder";
}

function playChime() {
    try {
        const ctx = new AudioContext();
        const now = ctx.currentTime;

        for (const [freq, start] of [[880, 0], [1320, 0.12]] as const) {
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();
            osc.type = "sine";
            osc.frequency.value = freq;
            gain.gain.setValueAtTime(0, now + start);
            gain.gain.linearRampToValueAtTime(0.2, now + start + 0.02);
            gain.gain.exponentialRampToValueAtTime(0.001, now + start + 0.3);
            osc.connect(gain).connect(ctx.destination);
            osc.start(now + start);
            osc.stop(now + start + 0.35);
        }

        setTimeout(() => ctx.close(), 800);
    } catch { }
}

function fireReminder(reminder: Reminder, jump: () => void) {
    if (settings.store.showToasts) {
        showToast(`Reminder: ${reminder.note}`, Toasts.Type.MESSAGE);
    }

    if (settings.store.playSound) playChime();

    showNotification({
        title: "Reminder",
        body: reminder.note,
        onClick: jump
    });
}

const MessageMenuItem: NavContextMenuPatchCallback = (children, { message }: { message: Message; }) => {
    if (!message) return;

    const channel = ChannelStore.getChannel(message.channel_id);

    children.push(
        <Menu.MenuItem
            id="vc-remind-me"
            label="Remind Me About This"
            icon={ClockIcon}
            action={() => openRemindModal({
                note: excerpt(message.content),
                channelId: message.channel_id,
                messageId: message.id,
                guildId: channel?.guild_id ?? null
            })}
        />
    );
};

export default definePlugin({
    name: "Reminders",
    authors: [Devs.Tsar],
    description: "Remind yourself about a message or anything else after a delay you choose. Reminders are kept locally and survive a client restart, with a notification and a jump straight back to the message when one fires.",
    tags: ["Utility"],
    settings,
    contextMenus: {
        "message": MessageMenuItem
    },

    async start() {
        await loadReminders();
        startChecking(fireReminder);
    },

    stop() {
        stopChecking();
    },

    commands: [
        {
            name: "remind",
            description: "Set a reminder for yourself",
            inputType: ApplicationCommandInputType.BUILT_IN,
            options: [
                {
                    name: "in",
                    description: "When to remind you, e.g. 10m, 2h30m, 1d",
                    type: ApplicationCommandOptionType.STRING,
                    required: true
                },
                {
                    name: "about",
                    description: "What to remind you about",
                    type: ApplicationCommandOptionType.STRING,
                    required: false
                }
            ],

            async execute(args, ctx) {
                const inStr: string = findOption(args, "in", "");
                const about: string = findOption(args, "about", "");
                const ms = parseDuration(inStr);

                if (!ms) {
                    sendBotMessage(ctx.channel.id, { content: `Couldn't understand "${inStr}". Try something like \`10m\`, \`2h30m\` or \`1d\`.` });
                    return;
                }

                await addReminder({
                    note: about || "Reminder",
                    dueAt: Date.now() + ms,
                    channelId: ctx.channel.id,
                    guildId: ChannelStore.getChannel(ctx.channel.id)?.guild_id ?? null
                });

                sendBotMessage(ctx.channel.id, {
                    content: `Got it, I'll remind you in ${inStr}.`
                });
            }
        }
    ]
});
