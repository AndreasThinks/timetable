import { and, eq, ne, sql } from "drizzle-orm";

import { db, discordAccounts, type DiscordAccount } from "@timetable/db";

/**
 * Linked Discord accounts (discord-account, 2026-10-12). Clerk owns the
 * OAuth connection; the API reads the member's Discord identity off Clerk
 * and hands it here, so this module stays Clerk-free like the rest of core.
 */

/** The Discord identity as read off Clerk's external account. */
export type DiscordIdentity = {
  discordUserId: string;
  username: string | null;
  globalName: string | null;
  avatarUrl: string | null;
};

export async function getDiscordAccount(
  userId: string,
): Promise<DiscordAccount | null> {
  const [row] = await db
    .select()
    .from(discordAccounts)
    .where(eq(discordAccounts.userId, userId))
    .limit(1);
  return row ?? null;
}

/** Look a member up by their Discord user id — what a Discord bot asks. */
export async function getUserIdByDiscordUserId(
  discordUserId: string,
): Promise<string | null> {
  const [row] = await db
    .select({ userId: discordAccounts.userId })
    .from(discordAccounts)
    .where(eq(discordAccounts.discordUserId, discordUserId))
    .limit(1);
  return row?.userId ?? null;
}

/**
 * Make the stored row match Clerk: upsert the identity, or delete the row
 * when the member has no Discord account linked (any more). Clerk lets a
 * Discord account belong to one user at a time, so a row holding the same
 * Discord id under someone else is stale — they unlinked and nobody synced
 * since — and is dropped rather than left to trip the unique constraint.
 */
export async function syncDiscordAccount(
  userId: string,
  identity: DiscordIdentity | null,
): Promise<DiscordAccount | null> {
  if (!identity) {
    await db.delete(discordAccounts).where(eq(discordAccounts.userId, userId));
    return null;
  }

  return db.transaction(async (tx) => {
    await tx
      .delete(discordAccounts)
      .where(
        and(
          eq(discordAccounts.discordUserId, identity.discordUserId),
          ne(discordAccounts.userId, userId),
        ),
      );

    const now = new Date();
    // linkedAt is when THIS Discord account was linked, so switching to a
    // different one resets it; a refresh of the same one only bumps
    // updatedAt.
    const [row] = await tx
      .insert(discordAccounts)
      .values({ userId, ...identity, linkedAt: now, updatedAt: now })
      .onConflictDoUpdate({
        target: discordAccounts.userId,
        set: {
          ...identity,
          linkedAt: sql`CASE WHEN ${discordAccounts.discordUserId} = excluded.discord_user_id THEN ${discordAccounts.linkedAt} ELSE excluded.linked_at END`,
          updatedAt: now,
        },
      })
      .returning();
    return row ?? null;
  });
}
