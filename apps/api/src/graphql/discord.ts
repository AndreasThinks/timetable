import { getDiscordAccount } from "@timetable/core";
import type { DiscordAccount } from "@timetable/db";

import { syncDiscordFromClerk } from "../auth/clerk";
import { assertActionLimit } from "../http/action-limits";

import { builder } from "./builder";
import { requireUser } from "./guards";

/**
 * The member's linked Discord account (discord-account, 2026-10-12).
 * Account-level, like API tokens. Linking itself happens in Clerk ("Account
 * & security" → Connected accounts, or signing in with Discord); these
 * fields read and refresh the local mirror a future Discord bot will use.
 *
 * `syncDiscordAccount` is absent from MUTATION_SCOPES, so no personal API
 * token can reach it (default-deny), and the view-as guard in app.ts
 * refuses it while previewing.
 */

const DiscordAccountType = builder
  .objectRef<DiscordAccount>("DiscordAccount")
  .implement({
    fields: (t) => ({
      discordUserId: t.exposeString("discordUserId"),
      username: t.exposeString("username", { nullable: true }),
      globalName: t.exposeString("globalName", { nullable: true }),
      avatarUrl: t.exposeString("avatarUrl", { nullable: true }),
      linkedAt: t.string({ resolve: (a) => a.linkedAt.toISOString() }),
    }),
  });

builder.queryFields((t) => ({
  /** The stored link, as of the last sync. Null when none. */
  myDiscordAccount: t.field({
    type: DiscordAccountType,
    nullable: true,
    resolve: async (_p, _a, ctx) => {
      const user = await requireUser(ctx);
      // Account-level data — not part of any forum's view-as preview.
      if (ctx.impersonation) return null;
      return getDiscordAccount(user.id);
    },
  }),
}));

builder.mutationFields((t) => ({
  /** Re-read the Discord link from Clerk, store it (or drop it when the
   * member unlinked), and return it. */
  syncDiscordAccount: t.field({
    type: DiscordAccountType,
    nullable: true,
    resolve: async (_p, _a, ctx) => {
      const user = await requireUser(ctx);
      await assertActionLimit(user.id, "discordSync");
      return syncDiscordFromClerk(user.id);
    },
  }),
}));
