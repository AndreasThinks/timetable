import type { User } from "@clerk/backend";
import { describe, expect, it } from "vitest";

import { discordIdentityFromClerkUser } from "./discord";

type Account = User["externalAccounts"][number];

function account(overrides: Partial<Account> = {}): Account {
  return {
    provider: "oauth_discord",
    providerUserId: "80351110224678912",
    externalId: "80351110224678912",
    username: "nelly",
    firstName: "Nelly",
    lastName: "",
    imageUrl: "https://img.example/nelly.png",
    verification: { status: "verified" },
    ...overrides,
  } as Account;
}

function user(...externalAccounts: Account[]) {
  return { externalAccounts };
}

describe("discordIdentityFromClerkUser", () => {
  it("maps a verified Discord account", () => {
    expect(discordIdentityFromClerkUser(user(account()))).toEqual({
      discordUserId: "80351110224678912",
      username: "nelly",
      globalName: "Nelly",
      avatarUrl: "https://img.example/nelly.png",
    });
  });

  it("is null without a Discord account", () => {
    expect(discordIdentityFromClerkUser(user())).toBeNull();
    expect(
      discordIdentityFromClerkUser(user(account({ provider: "oauth_google" }))),
    ).toBeNull();
  });

  it("ignores a connection that hasn't finished verifying", () => {
    const pending = account({
      verification: { status: "unverified" } as Account["verification"],
    });
    expect(discordIdentityFromClerkUser(user(pending))).toBeNull();
  });

  it("falls back to the deprecated externalId and nulls empty strings", () => {
    const identity = discordIdentityFromClerkUser(
      user(
        account({
          providerUserId: "",
          username: null,
          firstName: "",
          imageUrl: "",
        }),
      ),
    );
    expect(identity).toEqual({
      discordUserId: "80351110224678912",
      username: null,
      globalName: null,
      avatarUrl: null,
    });
  });
});
