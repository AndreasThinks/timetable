import type { User } from "@clerk/backend";

import type { DiscordIdentity } from "@timetable/core";

/** Clerk names the provider `oauth_discord` on backend user objects; the
 * bare name is accepted too so an SDK naming change can't silently unlink
 * everyone. */
const DISCORD_PROVIDERS = new Set(["oauth_discord", "discord"]);

/** The member's verified Discord account from their Clerk user, or null.
 * An unverified external account is a connection still in flight (or a
 * failed one), so it doesn't count as linked. */
export function discordIdentityFromClerkUser(
  cu: Pick<User, "externalAccounts">,
): DiscordIdentity | null {
  const account = cu.externalAccounts.find(
    (a) =>
      DISCORD_PROVIDERS.has(a.provider) &&
      a.verification?.status === "verified",
  );
  const discordUserId = account?.providerUserId || account?.externalId;
  if (!account || !discordUserId) return null;
  return {
    discordUserId,
    username: account.username || null,
    globalName:
      [account.firstName, account.lastName].filter(Boolean).join(" ") || null,
    avatarUrl: account.imageUrl || null,
  };
}
