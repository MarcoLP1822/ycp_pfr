CREATE TABLE "files" (
	"file_id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"file_name" text NOT NULL,
	"file_type" text NOT NULL,
	"upload_timestamp" timestamp DEFAULT now() NOT NULL,
	"proofreading_status" text NOT NULL,
	"version_number" integer DEFAULT 1 NOT NULL,
	"file_url" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "proofreading_logs" (
	"log_id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"file_id" uuid NOT NULL,
	"corrections" json NOT NULL,
	"timestamp" timestamp DEFAULT now() NOT NULL
);
