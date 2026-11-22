/*
 * Vencord, a Discord client mod
 * Copyright (c) 2026 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { Devs } from "@utils/constants";
import { t } from "@utils/i18n";
import definePlugin from "@utils/types";
import type { MessageAttachment } from "@vencord/discord-types";
import { useEffect, useState } from "@webpack/common";

const MAX_BYTES = 30 * 1024 * 1024;

const isPdf = (a: MessageAttachment) => a.content_type === "application/pdf" || /\.pdf$/i.test(a.filename);

function PdfPreview({ file }: { file: MessageAttachment; }) {
    const [open, setOpen] = useState(false);
    const [blobUrl, setBlobUrl] = useState<string | null>(null);
    const [failed, setFailed] = useState(false);

    useEffect(() => {
        if (!open || blobUrl || failed) return;
        let cancelled = false;
        fetch(file.url)
            .then(r => (r.ok ? r.blob() : Promise.reject(new Error(`HTTP ${r.status}`))))
            .then(b => { if (!cancelled) setBlobUrl(URL.createObjectURL(new Blob([b], { type: "application/pdf" }))); })
            .catch(() => { if (!cancelled) setFailed(true); });
        return () => { cancelled = true; };
    }, [open]);

    useEffect(() => () => { if (blobUrl) URL.revokeObjectURL(blobUrl); }, [blobUrl]);

    const button = { cursor: "pointer", color: "var(--text-link)", background: "none", border: 0, padding: 0, fontSize: "13px" } as const;

    return (
        <div style={{ marginTop: 4 }}>
            <button style={button} onClick={() => setOpen(o => !o)}>
                {open ? t("Hide preview of {name}", { name: file.filename }) : t("Preview {name}", { name: file.filename })}
            </button>
            {open && (
                failed
                    ? <div style={{ color: "var(--text-danger)", fontSize: 13 }}>{t("Could not load the PDF here. Open the file instead.")}</div>
                    : blobUrl
                        ? <iframe src={blobUrl} title={file.filename} style={{ display: "block", width: "min(640px, 100%)", height: 480, border: "1px solid var(--background-modifier-accent)", borderRadius: 4, marginTop: 4 }} />
                        : <div style={{ color: "var(--text-muted)", fontSize: 13 }}>{t("Loading...")}</div>
            )}
        </div>
    );
}

export default definePlugin({
    name: "PdfViewer",
    authors: [Devs.Tsar],
    description: "Adds a \"Preview\" link under PDF attachments that shows the file right in the chat, using the PDF viewer built into Discord's browser engine. If Discord blocks the embedded view on your version, the link says so and you can open the file the normal way.",
    tags: ["Media", "Chat"],

    renderMessageAccessory({ message }) {
        const pdfs = (message.attachments ?? []).filter(a => isPdf(a) && a.size <= MAX_BYTES);
        if (!pdfs.length) return null;
        return <>{pdfs.map(f => <PdfPreview key={f.id} file={f} />)}</>;
    }
});
