/*
 * Vencord, a Discord client mod
 * Copyright (c) 2026 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import * as DataStore from "@api/DataStore";

/**
 * A small write-behind key/value store on top of IndexedDB. Reads are served
 * from memory after the first hit, and writes are batched so that only the
 * entries that actually changed get cloned and stored, instead of
 * re-serialising a whole collection on every event.
 *
 * Callers must call `set` again after mutating a value they got from `get`.
 */
export function createKeyedStore<V>(dbName: string, options: { legacyKey?: string; flushMs?: number; } = {}) {
    const { legacyKey, flushMs = 2000 } = options;

    const idb = DataStore.createStore(dbName, "entries");
    // null marks a key known to be absent, so repeated misses skip IndexedDB
    const cache = new Map<string, V | null>();
    const dirty = new Set<string>();
    let timer: ReturnType<typeof setTimeout> | undefined;

    // Moves data from the old single-record layout (one big object in the
    // shared Vencord store) into this store, once.
    const ready = (async () => {
        if (!legacyKey) return;
        const legacy = await DataStore.get<Record<string, V>>(legacyKey);
        if (!legacy) return;

        await DataStore.setMany(Object.entries(legacy), idb);
        await DataStore.del(legacyKey);
    })().catch(() => { });

    async function flush() {
        timer = undefined;
        if (!dirty.size) return;

        const keys = [...dirty];
        dirty.clear();

        const toSet: [string, V][] = [];
        const toDelete: string[] = [];
        for (const key of keys) {
            const value = cache.get(key);
            if (value == null) toDelete.push(key);
            else toSet.push([key, value]);
        }

        if (toSet.length) await DataStore.setMany(toSet, idb);
        if (toDelete.length) await DataStore.delMany(toDelete, idb);
    }

    function schedule() {
        timer ??= setTimeout(flush, flushMs);
    }

    document.addEventListener("visibilitychange", () => {
        if (document.hidden) flush();
    });

    return {
        flush,

        async get(key: string): Promise<V | undefined> {
            await ready;
            if (!cache.has(key)) {
                const stored = await DataStore.get<V>(key, idb);
                // a set() may have landed while we were reading
                if (!cache.has(key)) cache.set(key, stored ?? null);
            }
            return cache.get(key) ?? undefined;
        },

        set(key: string, value: V) {
            cache.set(key, value);
            dirty.add(key);
            schedule();
        },

        delete(key: string) {
            cache.set(key, null);
            dirty.add(key);
            schedule();
        },

        async clear() {
            await ready;
            clearTimeout(timer);
            timer = undefined;
            cache.clear();
            dirty.clear();
            await DataStore.clear(idb);
        },

        /** Deletes every stored entry the predicate says is expired. Reads the whole store once, so run it rarely. */
        async prune(isExpired: (value: V) => boolean) {
            await ready;
            const stored = await DataStore.entries<string, V>(idb);
            const expired: string[] = [];
            for (const [key, value] of stored) {
                if (isExpired(cache.get(key) ?? value)) expired.push(key);
            }
            for (const key of expired) cache.delete(key);
            if (expired.length) await DataStore.delMany(expired, idb);
        }
    };
}
