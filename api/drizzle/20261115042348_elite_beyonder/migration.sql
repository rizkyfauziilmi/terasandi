CREATE TABLE "refresh_token_families" (
	"id" text PRIMARY KEY,
	"user_id" uuid NOT NULL,
	"revoked_at" timestamp with time zone,
	"family_expires_at" timestamp with time zone NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "refresh_tokens" (
	"id" text PRIMARY KEY,
	"family_id" text NOT NULL,
	"user_id" uuid NOT NULL,
	"created_at" timestamp with time zone NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"family_expires_at" timestamp with time zone NOT NULL,
	"used_at" timestamp with time zone,
	"claims" jsonb
);
--> statement-breakpoint
CREATE INDEX "refresh_token_families_user_id_idx" ON "refresh_token_families" ("user_id");--> statement-breakpoint
CREATE INDEX "refresh_token_families_family_expires_at_idx" ON "refresh_token_families" ("family_expires_at");--> statement-breakpoint
CREATE INDEX "refresh_tokens_family_id_idx" ON "refresh_tokens" ("family_id");--> statement-breakpoint
CREATE INDEX "refresh_tokens_user_id_idx" ON "refresh_tokens" ("user_id");--> statement-breakpoint
CREATE INDEX "refresh_tokens_family_expires_at_idx" ON "refresh_tokens" ("family_expires_at");--> statement-breakpoint
ALTER TABLE "refresh_token_families" ADD CONSTRAINT "refresh_token_families_user_id_users_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "refresh_tokens" ADD CONSTRAINT "refresh_tokens_family_id_refresh_token_families_id_fkey" FOREIGN KEY ("family_id") REFERENCES "refresh_token_families"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "refresh_tokens" ADD CONSTRAINT "refresh_tokens_user_id_users_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE;