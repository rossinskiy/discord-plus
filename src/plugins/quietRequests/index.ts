/*
 * Vencord, a Discord client mod
 * Copyright (c) 2026 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { Devs } from "@utils/constants";
import definePlugin from "@utils/types";

export default definePlugin({
    name: "QuietRequests",
    authors: [Devs.Tsar],
    description: "Stops Discord from asking its servers for things that no longer exist, so they do not fill the DevTools console with red 404 errors. Today that is the referral program check (/users/@me/referrals/eligibility), which Discord removed but its app still asks about.",
    tags: ["Console", "Utility"],

    patches: [
        {
            // The app asks how many referrals are left and treats an empty answer as "none". Give that answer
            // locally instead of sending the request that comes back as a 404.
            find: "BILLING_REFERRALS_REMAINING_FETCH_START",
            replacement: {
                match: /\i\.\i\.get\(\{url:\i\.\i\.GET_REFERRALS_REMAINING,oldFormErrors:!0,rejectWithError:!1\}\)/,
                replace: "Promise.resolve({body:null})"
            }
        }
    ]
});
