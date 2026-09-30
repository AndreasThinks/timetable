CREATE TABLE "push_subscriptions" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "membership_id" uuid NOT NULL CONSTRAINT "push_subscriptions_membership_id_timetable_memberships_id_fk" REFERENCES "timetable_memberships"("id") ON DELETE CASCADE,
  "endpoint" text NOT NULL,
  "last_checked_at" timestamp with time zone DEFAULT now() NOT NULL,
  "last_attempt_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX "push_membership_endpoint" ON "push_subscriptions" ("membership_id", "endpoint");
