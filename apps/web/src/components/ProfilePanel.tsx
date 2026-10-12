import { DiscordAccountPanel } from "@/components/DiscordAccountPanel";
import { ProfileForm } from "@/components/ProfileForm";
import type { DiscordAccount } from "@/lib/gqlFragments";

/** The profile editor. Profiles are per-forum (2026-07): inside a forum
 * (/f/[slug]/profile) the name/photo/bio form edits that forum's
 * membership; the standalone /profile page is account-only. Appearance
 * lives in the sidebar foot and email digests on the notifications page
 * (QA 2026-07-28). */
export function ProfilePanel({
  email,
  slug,
  profile,
  discord,
}: {
  email: string | null;
  /** Forum context; null on the standalone account page. */
  slug: string | null;
  /** The viewer's membership profile in `slug`; null when not a member. */
  profile: {
    name: string | null;
    bio: string | null;
    image: string | null;
  } | null;
  /** The viewer's linked Discord account, account-level like email. */
  discord: DiscordAccount | null;
}) {
  return (
    <div className="stack">
      <div className="page-head">
        <h2 className="page-title">Profile</h2>
        <p>{email}</p>
      </div>
      {slug && profile ? (
        <ProfileForm
          slug={slug}
          name={profile.name}
          bio={profile.bio}
          image={profile.image}
        />
      ) : (
        <div className="card">
          <p className="faint" style={{ margin: 0 }}>
            Your name, photo, and bio are set per forum — open Profile inside
            one of your forums to edit how you appear there.
          </p>
        </div>
      )}
      <DiscordAccountPanel initial={discord} />
    </div>
  );
}
