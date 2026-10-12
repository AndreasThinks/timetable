CREATE TABLE "discord_account" (
	"user_id" text PRIMARY KEY NOT NULL,
	"discord_user_id" text NOT NULL,
	"username" text,
	"global_name" text,
	"avatar_url" text,
	"linked_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "discord_account_discordUserId_unique" UNIQUE("discord_user_id")
);
--> statement-breakpoint
ALTER TABLE "discord_account" ADD CONSTRAINT "discord_account_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;