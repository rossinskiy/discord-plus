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

import { ChatBarButton } from "@api/ChatButtons";
import { Devs } from "@utils/constants";
import definePlugin from "@utils/types";

import { PetIcon } from "./PetIcon";

export default definePlugin({
    name: "ChatPet",
    authors: [Devs.Tsar],
    description: "A little creature that lives on your chat bar and watches your cursor.",
    tags: ["Fun"],

    chatBarButton: {
        render(props) {
            return (
                <ChatBarButton tooltip="Your pet" onClick={() => {}}>
                    <PetIcon />
                </ChatBarButton>
            );
        },
        // PetIcon's props are a subset of what IconComponent allows; only used for Settings UI display.
        icon: PetIcon as any
    }
});
