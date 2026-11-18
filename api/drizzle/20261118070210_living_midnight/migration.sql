CREATE TYPE "file_category" AS ENUM('document', 'image', 'audio', 'video');--> statement-breakpoint
CREATE TABLE "files" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"user_id" uuid NOT NULL,
	"name" text NOT NULL,
	"size" bigint NOT NULL,
	"mime_type" text NOT NULL,
	"category" "file_category" NOT NULL,
	"storage_key" text NOT NULL,
	"etag" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE INDEX "files_user_id_created_at_idx" ON "files" ("user_id","created_at");--> statement-breakpoint
CREATE INDEX "files_user_id_category_idx" ON "files" ("user_id","category");--> statement-breakpoint
CREATE UNIQUE INDEX "files_storage_key_idx" ON "files" ("storage_key");--> statement-breakpoint
ALTER TABLE "files" ADD CONSTRAINT "files_user_id_users_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE;