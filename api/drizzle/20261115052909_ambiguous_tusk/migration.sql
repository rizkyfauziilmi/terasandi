CREATE TYPE "user_role" AS ENUM('admin', 'user');--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "role" "user_role" DEFAULT 'user'::"user_role" NOT NULL;--> statement-breakpoint
-- The user who onboarded (the oldest account) administers existing installs.
UPDATE "users" SET "role" = 'admin' WHERE "id" = (
	SELECT "id" FROM "users" ORDER BY "created_at", "id" LIMIT 1
);
