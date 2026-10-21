/*
 * Vencord, a Discord client mod
 * Copyright (c) 2026 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import * as DataStore from "@api/DataStore";
import { NavigationRouter } from "@webpack/common";
import { nanoid } from "nanoid";

const STORE_KEY = "Reminders_data";
const CHECK_INTERVAL_MS = 15_000;

export interface Reminder {
    id: string;
    note: string;
    dueAt: number;
    createdAt: number;
    channelId?: string;
    messageId?: string;
    guildId?: string | null;
}

export const reminders: Reminder[] = [];
const listeners = new Set<() => void>();
let checkTimer: ReturnType<typeof setInterval> | undefined;

export function subscribe(fn: () => void) {
    listeners.add(fn);
    return () => { listeners.delete(fn); };
}

function emit() {
    listeners.forEach(fn => fn());
}

function sortByDueAt() {
    reminders.sort((a, b) => a.dueAt - b.dueAt);
}

async function persist() {
    await DataStore.set(STORE_KEY, reminders);
}

export async function loadReminders() {
    const stored = await DataStore.get<Reminder[]>(STORE_KEY) ?? [];
    reminders.splice(0, reminders.length, ...stored);
    sortByDueAt();
    emit();
}

export async function addReminder(data: { note: string; dueAt: number; channelId?: string; messageId?: string; guildId?: string | null; }) {
    const reminder: Reminder = {
        id: nanoid(),
        note: data.note,
        dueAt: data.dueAt,
        createdAt: Date.now(),
        channelId: data.channelId,
        messageId: data.messageId,
        guildId: data.guildId ?? null
    };
    reminders.push(reminder);
    sortByDueAt();
    await persist();
    emit();
    return reminder;
}

export async function removeReminder(id: string) {
    const idx = reminders.findIndex(r => r.id === id);
    if (idx === -1) return;
    reminders.splice(idx, 1);
    await persist();
    emit();
}

function jumpTo(reminder: Reminder) {
    if (!reminder.channelId) return;

    if (reminder.messageId) {
        NavigationRouter.transitionTo(
            reminder.guildId
                ? `/channels/${reminder.guildId}/${reminder.channelId}/${reminder.messageId}`
                : `/channels/@me/${reminder.channelId}/${reminder.messageId}`
        );
    } else {
        NavigationRouter.transitionTo(
            reminder.guildId
                ? `/channels/${reminder.guildId}/${reminder.channelId}`
                : `/channels/@me/${reminder.channelId}`
        );
    }
}

type Fire = (reminder: Reminder, jump: () => void) => void;

export function startChecking(onDue: Fire) {
    if (checkTimer) return;

    const check = async () => {
        const now = Date.now();
        const due = reminders.filter(r => r.dueAt <= now);
        if (!due.length) return;

        for (const reminder of due) onDue(reminder, () => jumpTo(reminder));
        for (const reminder of due) await removeReminder(reminder.id);
    };

    check();
    checkTimer = setInterval(check, CHECK_INTERVAL_MS);
}

export function stopChecking() {
    clearInterval(checkTimer);
    checkTimer = undefined;
}
