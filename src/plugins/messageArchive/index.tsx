/*
 * Discord+, a fork of Vencord
 * Copyright (c) 2023 Vendicated and contributors
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU General Public License for more details.
 *
 * You should have received a copy of the GNU General Public License
 * along with this program.  If not, see <https://www.gnu.org/licenses/>.
*/

import "./messageArchive.css";

import { findGroupChildrenByChildId, NavContextMenuPatchCallback } from "@api/ContextMenu";
import { updateMessage } from "@api/MessageUpdater";
import { isPluginEnabled } from "@api/PluginManager";
import { disableStyle, enableStyle } from "@api/Styles";
import ErrorBoundary from "@components/ErrorBoundary";
import { DeleteIcon, EyeIcon } from "@components/Icons";
import { Devs } from "@utils/constants";
import { getIntlMessage } from "@utils/discord";
import { Logger } from "@utils/Logger";
import { classes } from "@utils/misc";
import definePlugin from "@utils/types";
import { Message, MessageAttachment } from "@vencord/discord-types";
import { findCssClassesLazy } from "@webpack";
import { ChannelStore, FluxDispatcher, Menu, MessageStore, Timestamp, UserStore, useStateFromStores } from "@webpack/common";

import { sendEvents } from "./api";
import overlayStyle from "./deleteStyleOverlay.css?managed";
import textStyle from "./deleteStyleText.css?managed";
import { openHistoryModal } from "./HistoryModal";
import { parseEditContent } from "./parseEditContent";
import { settings } from "./settings";

const logger = new Logger("MessageArchive");

interface MAMessage extends Message {
    deleted?: boolean;
    editHistory?: { timestamp: Date; content: string; }[];
    firstEditTimestamp?: Date;
}

interface MAAttachment extends MessageAttachment {
    deleted?: boolean;
}

const MessageClasses = findCssClassesLazy("edited", "communicationDisabled", "isSystemMessage");

function addDeleteStyle() {
    if (settings.store.deleteStyle === "text") {
        enableStyle(textStyle);
        disableStyle(overlayStyle);
    } else {
        disableStyle(textStyle);
        enableStyle(overlayStyle);
    }
}

const REMOVE_HISTORY_ID = "ma-remove-history";
const TOGGLE_DELETE_STYLE_ID = "ma-toggle-style";

function clearMessageHistory(msg: MAMessage) {
    if (msg.deleted) {
        FluxDispatcher.dispatch({
            type: "MESSAGE_DELETE",
            channelId: msg.channel_id,
            id: msg.id,
            maDeleted: true
        });
    } else {
        const attachments = msg.attachments?.filter((a: MAAttachment) => !a.deleted);
        updateMessage(msg.channel_id, msg.id, { editHistory: [], attachments });
    }
}

function doesMessageHaveHistory(message: MAMessage): boolean {
    return message.deleted || !!message.editHistory?.length || message.attachments?.some((a: MAAttachment) => a.deleted);
}

function shouldIgnore(message: any, isEdit = false) {
    try {
        const { ignoreBots, ignoreSelf, ignoreUsers, ignoreChannels, ignoreGuilds, logEdits, logDeletes } = settings.store;
        const myId = UserStore.getCurrentUser()?.id;
        const guildId = ChannelStore.getChannel(message.channel_id)?.guild_id;

        return (ignoreBots && message.author?.bot) ||
            (ignoreSelf && message.author?.id === myId) ||
            ignoreUsers.split(",").map((s: string) => s.trim()).includes(message.author?.id) ||
            ignoreChannels.split(",").map((s: string) => s.trim()).includes(message.channel_id) ||
            ignoreGuilds.split(",").map((s: string) => s.trim()).includes(guildId) ||
            (isEdit ? !logEdits : !logDeletes);
    } catch {
        return false;
    }
}

function toArchiveEvent(message: any) {
    return {
        type: "upsert" as const,
        messageId: message.id,
        channelId: message.channel_id,
        guildId: ChannelStore.getChannel(message.channel_id)?.guild_id ?? null,
        authorId: message.author?.id ?? null,
        content: message.content ?? "",
        attachments: (message.attachments ?? []).map((a: any) => ({ id: a.id, filename: a.filename, url: a.url })),
        timestamp: Date.now()
    };
}

const patchMessageContextMenu: NavContextMenuPatchCallback = (children, props) => {
    const { message } = props;
    const { deleted, id, channel_id } = message;

    if (!doesMessageHaveHistory(message)) return;

    toggle: {
        if (!deleted) break toggle;

        const domElement = document.getElementById(`chat-messages-${channel_id}-${id}`);
        if (!domElement) break toggle;

        children.push((
            <Menu.MenuItem
                id={TOGGLE_DELETE_STYLE_ID}
                key={TOGGLE_DELETE_STYLE_ID}
                label="Toggle Deleted Highlight"
                leadingAccessory={{ type: "icon", icon: EyeIcon }}
                action={() => domElement.classList.toggle("messagelogger-deleted")}
            />
        ));
    }

    children.push((
        <Menu.MenuItem
            id={REMOVE_HISTORY_ID}
            key={REMOVE_HISTORY_ID}
            label="Remove Message History"
            leadingAccessory={{ type: "icon", icon: DeleteIcon }}
            color="danger"
            action={() => clearMessageHistory(message)}
        />
    ));

    children.push((
        <Menu.MenuItem
            id="ma-view-archive"
            key="ma-view-archive"
            label="View Archive History"
            action={() => openHistoryModal(message.id)}
        />
    ));
};

const patchChannelContextMenu: NavContextMenuPatchCallback = (children, { channel }) => {
    const messages = MessageStore.getMessages(channel?.id);
    if (!messages?.some((msg: MAMessage) => doesMessageHaveHistory(msg))) return;

    const group = findGroupChildrenByChildId("mark-channel-read", children) ?? children;
    group.push(
        <Menu.MenuItem
            id="vc-ma-clear-channel"
            label="Clear Message Log"
            color="danger"
            action={() => messages.forEach((msg: MAMessage) => clearMessageHistory(msg))}
        />
    );
};

export default definePlugin({
    name: "MessageArchive",
    description: "Logs deleted/edited messages inline (like MessageLogger) and persists them to your own server so history survives a client restart.",
    tags: ["Chat", "Utility"],
    authors: [Devs.Tsar],
    dependencies: ["MessageUpdaterAPI"],
    settings,
    contextMenus: {
        "message": patchMessageContextMenu,
        "channel-context": patchChannelContextMenu,
        "thread-context": patchChannelContextMenu,
        "user-context": patchChannelContextMenu,
        "gdm-context": patchChannelContextMenu
    },

    start() {
        if (isPluginEnabled("MessageLogger")) {
            throw new Error("MessageArchive can't be enabled while MessageLogger is enabled — disable MessageLogger first, they do the same job and conflict with each other.");
        }
        addDeleteStyle();
    },

    renderEdits: ErrorBoundary.wrap(({ message: { id: messageId, channel_id: channelId } }: { message: Message; }) => {
        const message = useStateFromStores(
            [MessageStore],
            () => MessageStore.getMessage(channelId, messageId) as MAMessage,
            null,
            (oldMsg, newMsg) => oldMsg?.editHistory === newMsg?.editHistory
        );

        return settings.store.inlineEdits && (
            <>
                {message.editHistory?.map((edit, idx) => (
                    <div key={idx} className="messagelogger-edited">
                        {parseEditContent(edit.content, channelId)}
                        <Timestamp
                            timestamp={edit.timestamp}
                            isEdited={true}
                            isInline={false}
                        >
                            <span className={MessageClasses.edited}>{" "}({getIntlMessage("MESSAGE_EDITED")})</span>
                        </Timestamp>
                    </div>
                ))}
            </>
        );
    }, { noop: true }),

    makeEdit(newMessage: any, oldMessage: any): any {
        if (!shouldIgnore(newMessage, true)) {
            sendEvents([toArchiveEvent(newMessage)]);
        }
        return {
            timestamp: new Date(newMessage.edited_timestamp),
            content: oldMessage.content
        };
    },

    handleUpdateAttachments(newMessage: MAMessage): MAAttachment[] {
        const oldMessage = MessageStore.getMessage(newMessage.channel_id, newMessage.id) as MAMessage | undefined;
        if (!oldMessage || this.shouldIgnore(newMessage, true)) {
            return newMessage.attachments;
        }
        if (!newMessage.attachments?.length) {
            return oldMessage.attachments.map((a): MAAttachment => ({ ...a, deleted: true }));
        }
        return oldMessage.attachments
            .map((oldAttachment): MAAttachment =>
                newMessage.attachments.find(a => a.id === oldAttachment.id)
                ?? { ...oldAttachment, deleted: true }
            )
            .concat(newMessage.attachments.filter(a => !oldMessage.attachments.some(o => o.id === a.id)));
    },

    handleDelete(cache: any, data: { ids: string[], id: string; maDeleted?: boolean; }, isBulk: boolean) {
        try {
            if (cache == null || (!isBulk && !cache.has(data.id))) return cache;

            const mutate = (id: string) => {
                const msg = cache.get(id);
                if (!msg) return;

                const EPHEMERAL = 64;
                const ignore = data.maDeleted ||
                    (msg.flags & EPHEMERAL) === EPHEMERAL ||
                    shouldIgnore(msg);

                if (ignore) {
                    cache = cache.remove(id);
                } else {
                    if (!data.maDeleted) {
                        sendEvents([{
                            type: "delete",
                            messageId: id,
                            channelId: msg.channel_id,
                            timestamp: Date.now()
                        }]);
                    }
                    cache = cache.update(id, m => m
                        .set("deleted", true)
                        .set("attachments", m.attachments.map(a => (a.deleted = true, a))));
                }
            };

            if (isBulk) {
                data.ids.forEach(mutate);
            } else {
                mutate(data.id);
            }
        } catch (e) {
            logger.error("Error during handleDelete", e);
        }
        return cache;
    },

    shouldIgnore,

    normalizeNonce(msg: Message) {
        try {
            if (!msg.nonce || msg.author.id === UserStore.getCurrentUser()?.id) return;

            const prevMsg = MessageStore.getMessage(msg.channel_id, msg.nonce as string);
            if (!prevMsg || prevMsg.state !== "SENT") return;

            if (prevMsg.id !== msg.id) {
                delete (msg as any).nonce;
            }
        } catch (e) {
            logger.error("Error normalizing nonce", e);
        }
    },

    EditMarker({ message, className, children, ...props }: any) {
        return (
            <span
                {...props}
                className={classes("messagelogger-edit-marker", className)}
                onClick={() => openHistoryModal(message.id)}
                role="button"
            >
                {children}
            </span>
        );
    },

    DELETED_MESSAGE_COUNT: () => ({
        ast: [[
            6,
            "count",
            {
                "=0": ["No deleted messages"],
                one: [
                    [1, "count"],
                    " deleted message"
                ],
                other: [
                    [1, "count"],
                    " deleted messages"
                ]
            },
            0,
            "cardinal"
        ]]
    }),

    patches: [
        {
            find: '"MessageStore"',
            replacement: [
                {
                    match: /(?<=MESSAGE_DELETE:function\((\i)\)\{)(?=let.{0,100}(\i\.\i)\.getOrCreate)/,
                    replace: `
                        let cache = $2.getOrCreate($1.channelId);
                        cache = $self.handleDelete(cache, $1, false);
                        $2.commit(cache);
                        return;
                    `
                },
                {
                    match: /(?<=MESSAGE_DELETE_BULK:function\((\i)\){)(?=let.{0,100}(\i\.\i)\.getOrCreate)/,
                    replace: `
                        let cache = $2.getOrCreate($1.channelId);
                        cache = $self.handleDelete(cache, $1, true);
                        $2.commit(cache);
                        return;
                    `
                },
                {
                    match: /(MESSAGE_UPDATE:function\((\i)\).+?)\.update\((\i)/,
                    replace: `
                        $1
                        .update($3, m =>
                            (($2.message.flags & 64) === 64 || $self.shouldIgnore($2.message, true)) ? m :
                            $2.message.edited_timestamp && $2.message.content !== m.content ?
                                m.set('editHistory',[...(m.editHistory || []), $self.makeEdit($2.message, m)]) :
                                m
                        )
                        .update($3
                    `
                },
                {
                    match: /(?<=getLastEditableMessage\(\i\)\{.{0,200}\.find\((\i)=>)/,
                    replace: "!$1.deleted &&"
                }
            ]
        },

        {
            find: "}addReaction(",
            replacement: [
                {
                    match: /this\.customRenderedContent=(\i)\.customRenderedContent,/,
                    replace: "this.customRenderedContent = $1.customRenderedContent," +
                        "this.deleted = $1.deleted || false," +
                        "this.editHistory = $1.editHistory || []," +
                        "this.firstEditTimestamp = $1.firstEditTimestamp || this.editedTimestamp || this.timestamp,"
                }
            ]
        },

        {
            find: ".PREMIUM_REFERRAL&&(",
            replacement: [
                {
                    match: /(?<=null!=\i\.edited_timestamp\)return )\i\(\i,\{reactions:(\i)\.reactions.{0,50}\}\)/,
                    replace:
                        "Object.assign($&,{ deleted:$1.deleted, editHistory:$1.editHistory, firstEditTimestamp:$1.firstEditTimestamp })"
                },
                {
                    match: /attachments:(\i)\.attachments\?\?\[\],/,
                    predicate: () => settings.store.logDeletedAttachments,
                    replace: "attachments: $self.handleUpdateAttachments($1),"
                }
            ]
        },

        {
            find: "#{intl::REMOVE_ATTACHMENT_TOOLTIP_TEXT}",
            replacement: [
                {
                    match: /\.SPOILER,(?=\[\i\.\i\]:)(?<=item:(\i),.{0,200}?)/,
                    replace: '$&"messagelogger-deleted-attachment": $1?.originalItem?.deleted,'
                },
                {
                    match: /(?<=\{let\{[^}]*?item:(\i),autoPlayGif:\i,)canRemoveItem:(\i)(?=,onRemoveItem:)/,
                    replace: "_canRemoveItem:$2 = arguments[0].canRemoveItem && !$1?.originalItem?.deleted",
                }
            ]
        },

        {
            find: "Message must not be a thread starter message",
            replacement: [
                {
                    match: /\)\("li",\{(.+?),className:/,
                    replace: ")(\"li\",{$1,className:(arguments[0].message.deleted ? \"messagelogger-deleted \" : \"\")+"
                }
            ]
        },

        {
            find: ".SEND_FAILED,",
            replacement: {
                match: /\]:\i.isUnsupported.{0,20}?,children:\[/,
                replace: "$&arguments[0]?.message?.editHistory?.length>0&&$self.renderEdits(arguments[0]),"
            }
        },

        {
            find: "#{intl::MESSAGE_EDITED}",
            replacement: {
                match: /(isInline:!1,children:.{0,50}?)"span",\{(?=className:)/,
                replace: "$1$self.EditMarker,{message:arguments[0].message,"
            }
        },

        {
            find: '"ReferencedMessageStore"',
            replacement: [
                {
                    match: /(?<=MESSAGE_DELETE:function\(\i\)\{)/,
                    replace: "return;"
                },
                {
                    match: /(?<=MESSAGE_DELETE_BULK:function\(\i\)\{)/,
                    replace: "return;"
                }
            ]
        },

        {
            find: ".MESSAGE,commandTargetId:",
            replacement: [
                {
                    match: /children:(\[""===.+?\])/,
                    replace: "children:arguments[0].message.deleted?[]:$1"
                }
            ]
        },
        {
            find: "NON_COLLAPSIBLE.has(",
            replacement: {
                match: /if\((\i)\.blocked\)return \i\.\i\.MESSAGE_GROUP_BLOCKED;/,
                replace: '$&else if($1.deleted) return"MESSAGE_GROUP_DELETED";',
            },
            predicate: () => settings.store.collapseDeleted
        },
        {
            find: "#{intl::NEW_MESSAGES_ESTIMATED_WITH_DATE}",
            replacement: [
                {
                    match: /(\i).type===\i\.\i\.MESSAGE_GROUP_BLOCKED\|\|/,
                    replace: '$&$1.type==="MESSAGE_GROUP_DELETED"||',
                },
                {
                    match: /(\i).type===\i\.\i\.MESSAGE_GROUP_BLOCKED\?(\i)=.*?:/,
                    replace: '$&$1.type==="MESSAGE_GROUP_DELETED"?$2=$self.DELETED_MESSAGE_COUNT:',
                },
            ],
            predicate: () => settings.store.collapseDeleted
        },

        {
            find: "this.truncateTop",
            replacement: {
                match: /receiveMessage\((\i)\)\{/,
                replace: "$& $self.normalizeNonce($1);"
            }
        }
    ],

    flux: {
        MESSAGE_CREATE({ message }: { message: any; }) {
            if (shouldIgnore(message)) return;
            sendEvents([toArchiveEvent(message)]);
        }
    }
});
