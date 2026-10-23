/*
 * Vencord, a Discord client mod
 * Copyright (c) 2026 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import ErrorBoundary from "@components/ErrorBoundary";
import type { RenderModalProps } from "@vencord/discord-types";
import { Modal, openModal, useEffect, useRef, useState } from "@webpack/common";

import { Bricks } from "./Bricks";
import { Chill } from "./Chill";
import { Farm } from "./Farm";
import { Fidget } from "./Fidget";
import { Fishing } from "./Fishing";
import { Goals } from "./Goals";

const TABS = [
    { id: "farm", label: "Garden" },
    { id: "fishing", label: "Fishing" },
    { id: "bricks", label: "Bricks" },
    { id: "goals", label: "Goals" },
    { id: "fidget", label: "Fidget" },
    { id: "chill", label: "Chill" }
] as const;

type TabId = typeof TABS[number]["id"];

export function openLoungeModal() {
    openModal(props =>
        <ErrorBoundary>
            <LoungeModal modalProps={props} />
        </ErrorBoundary>
    );
}

function LoungeModal({ modalProps }: { modalProps: RenderModalProps; }) {
    const [tab, setTab] = useState<TabId>("farm");
    const rootRef = useRef<HTMLDivElement>(null);

    // Discord's modal classes are hashed, so stretch every wrapper between our
    // content and the fixed layer instead of guessing a selector.
    useEffect(() => {
        const touched: HTMLElement[] = [];
        let el = rootRef.current?.parentElement ?? null;
        for (let i = 0; el && i < 10 && el !== document.body; i++, el = el.parentElement) {
            if (getComputedStyle(el).position === "fixed") break;
            for (const [prop, value] of [["width", "100vw"], ["max-width", "100vw"], ["height", "100vh"], ["max-height", "100vh"], ["border-radius", "0"]]) {
                el.style.setProperty(prop, value, "important");
            }
            touched.push(el);
        }
        return () => touched.forEach(e => e.removeAttribute("style"));
    }, []);

    return (
        <Modal {...modalProps} size="xl" title="Idle Lounge">
            <div className="vc-lounge" ref={rootRef}>
                <div className="vc-lounge-tabs" role="tablist">
                    {TABS.map(t => (
                        <button
                            key={t.id}
                            className="vc-lounge-tab"
                            role="tab"
                            aria-selected={tab === t.id}
                            onClick={() => setTab(t.id)}
                        >
                            {t.label}
                        </button>
                    ))}
                </div>

                {/* Garden and Fishing stay mounted so the auto-fisher keeps casting on other tabs. */}
                <div className="vc-lounge-body">
                    <div style={{ display: tab === "farm" ? undefined : "none" }}><Farm /></div>
                    <div style={{ display: tab === "fishing" ? undefined : "none" }}><Fishing /></div>
                    {tab === "bricks" && <Bricks />}
                    {tab === "goals" && <Goals />}
                    {tab === "fidget" && <Fidget />}
                    {tab === "chill" && <Chill />}
                </div>
            </div>
        </Modal>
    );
}
