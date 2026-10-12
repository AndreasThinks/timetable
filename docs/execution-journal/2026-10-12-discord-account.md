# 2026-10-12 — Log in with Discord + linked Discord accounts

## The ask

Andreas: add log in with Discord / Discord OAuth, and store the member's
Discord account details so later work can add Discord features (e.g. a bot
that helps you ❤️ topics).

## Decisions

1. **Clerk does the OAuth.** Auth is already Clerk end to end, and Discord
   is one of its social connections — enabling it in the Clerk dashboard
   (per instance: dev and prod, each with a Discord application's client
   id/secret) puts "Continue with Discord" on our `<SignIn />` /
   `<SignUp />` with no code. Clerk keeps the OAuth tokens; if a feature
   ever needs to call Discord as the member,
   `clerkClient.users.getUserOauthAccessToken(userId, "discord")` gets one.
2. **Mirror only the identity.** `discord_account` holds the Discord user
   id (unique — what a bot looks people up by), username, display name and
   avatar. One row per user, cascade-deleted with the user. Additive
   migration (0046), per the term-time policy.
3. **Sync without a webhook.** Profile fields were only ever copied on
   first sign-in, which would miss anyone linking Discord later. Rather
   than introduce the app's first Clerk webhook (new endpoint, signing
   secret in every spec), the profile page's Discord card calls a
   `syncDiscordAccount` mutation on mount and whenever Clerk's view of the
   link changes; first sign-in syncs too, so signing up with Discord is
   linked immediately. A webhook can come with the bot.
4. **Clerk is the truth.** A sync with no verified Discord account deletes
   the row; a row holding the same Discord id under another user is stale
   (Clerk allows one owner) and is dropped. Switching to a different
   Discord account resets `linkedAt`; refreshing the same one only bumps
   `updatedAt`. A Clerk lookup failure throws rather than reading as
   "unlinked".

## What was built

- `packages/db`: `discordAccounts` schema + migration 0046.
- `packages/core/src/discordAccounts.ts`: `getDiscordAccount`,
  `getUserIdByDiscordUserId`, `syncDiscordAccount`.
- `apps/api`: `auth/discord.ts` (`discordIdentityFromClerkUser`, unit
  tested), first-sign-in sync and `syncDiscordFromClerk` in
  `auth/clerk.ts`, `graphql/discord.ts` (`myDiscordAccount` query,
  `syncDiscordAccount` mutation — session-only, refused while previewing,
  `discordSync` action limit of 10/min).
- `apps/web`: `DiscordAccountPanel` under the profile form on both profile
  pages — Connect Discord (Clerk's `createExternalAccount` redirect) or the
  linked account with Disconnect.

## Verified

Migration applied to a fresh Postgres 16; `syncDiscordAccount` exercised
against it (refresh keeps `linkedAt`, switching resets it, a stale row under
another user is dropped, unlink deletes). Build, typecheck, lint, format,
unit tests and the e2e smoke suite pass. Not exercised end to end: the real
Discord round trip, which needs Discord enabled on a Clerk instance.

## Setup still needed (humans)

Enable Discord under Clerk → SSO connections for the dev instance (and prod
when ready), with a Discord application's credentials and Clerk's redirect
URI registered on the Discord side. Until then the Connect button shows
Clerk's error as a toast.
