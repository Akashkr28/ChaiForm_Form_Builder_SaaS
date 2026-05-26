ALTER TABLE "users" ADD COLUMN "auth_provider" varchar(40) DEFAULT 'credentials' NOT NULL;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "auth_provider_id" varchar(255);