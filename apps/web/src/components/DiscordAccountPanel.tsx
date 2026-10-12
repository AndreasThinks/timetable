"use client";

import { useUser } from "@clerk/nextjs";
import { useCallback, useEffect, useRef, useState } from "react";

import { Avatar } from "@/components/Avatar";
import { useToast } from "@/components/Toast";
import { clientGql } from "@/lib/clientGraphql";
import {
  DISCORD_ACCOUNT_FIELDS,
  type DiscordAccount,
} from "@/lib/gqlFragments";

const SYNC_MUTATION = `mutation SyncDiscordAccount {
  syncDiscordAccount { ${DISCORD_ACCOUNT_FIELDS} }
}`;

/** Clerk's frontend names the provider without the `oauth_` prefix. */
const DISCORD_PROVIDER = "discord";

function clerkErrorMessage(err: unknown, fallback: string): string {
  const first = (
    err as { errors?: { longMessage?: string; message?: string }[] }
  )?.errors?.[0];
  return first?.longMessage ?? first?.message ?? fallback;
}

/**
 * The profile page's Discord card (discord-account, 2026-10-12). Clerk owns
 * the OAuth connection: Connect runs Clerk's connect-an-account redirect to
 * Discord and back here, Disconnect removes it from Clerk. Either way the
 * API's `syncDiscordAccount` then mirrors Clerk into our own table — run on
 * mount and whenever Clerk's view of the Discord link changes — which is
 * what a future Discord bot reads.
 */
export function DiscordAccountPanel({
  initial,
}: {
  initial: DiscordAccount | null;
}) {
  const { user, isLoaded } = useUser();
  const { toast, toastError } = useToast();
  const [account, setAccount] = useState(initial);
  const [busy, setBusy] = useState(false);

  const clerkDiscord = user?.externalAccounts.find(
    (a) => a.provider === DISCORD_PROVIDER,
  );
  // What the sync depends on: which Discord account Clerk holds, and whether
  // its connection finished.
  const clerkKey = clerkDiscord
    ? `${clerkDiscord.providerUserId}:${clerkDiscord.verification?.status}`
    : "none";

  const sync = useCallback(async () => {
    const data = await clientGql<{ syncDiscordAccount: DiscordAccount | null }>(
      SYNC_MUTATION,
    );
    setAccount(data.syncDiscordAccount);
  }, []);

  const lastSynced = useRef<string | null>(null);
  useEffect(() => {
    if (!isLoaded || !user || lastSynced.current === clerkKey) return;
    lastSynced.current = clerkKey;
    // Quiet on failure: the stored link stays on screen, and the next visit
    // tries again.
    sync().catch(() => {});
  }, [isLoaded, user, clerkKey, sync]);

  async function connect() {
    if (!user) return;
    setBusy(true);
    try {
      const external = await user.createExternalAccount({
        strategy: "oauth_discord",
        redirectUrl: window.location.href,
      });
      const url = external.verification?.externalVerificationRedirectURL;
      if (!url) throw new Error("Discord didn't return a sign-in page");
      window.location.assign(url.href);
    } catch (err) {
      toastError(clerkErrorMessage(err, "Couldn't start connecting Discord"));
      setBusy(false);
    }
  }

  async function disconnect() {
    if (!user || !clerkDiscord) return;
    setBusy(true);
    try {
      await clerkDiscord.destroy();
      await user.reload();
      await sync();
      toast("Discord disconnected");
    } catch (err) {
      toastError(clerkErrorMessage(err, "Couldn't disconnect Discord"));
    } finally {
      setBusy(false);
    }
  }

  const label = account
    ? (account.globalName ?? account.username ?? "Discord account")
    : null;

  return (
    <section className="stack">
      <h3 className="section-title">Discord</h3>
      <div className="card">
        {account ? (
          <div className="row wrap">
            <Avatar name={label} image={account.avatarUrl} />
            <div style={{ flex: 1, minWidth: 0 }}>
              <div>{label}</div>
              {account.username ? (
                <div className="faint">@{account.username}</div>
              ) : null}
            </div>
            <button
              type="button"
              className="btn btn-sm"
              onClick={disconnect}
              disabled={busy || !clerkDiscord}
            >
              Disconnect
            </button>
          </div>
        ) : (
          <div className="row wrap">
            <p className="faint" style={{ margin: 0, flex: 1, minWidth: 0 }}>
              Connect your Discord account to sign in with it.
            </p>
            <button
              type="button"
              className="btn btn-sm"
              onClick={connect}
              disabled={busy || !isLoaded}
            >
              Connect Discord
            </button>
          </div>
        )}
      </div>
    </section>
  );
}
