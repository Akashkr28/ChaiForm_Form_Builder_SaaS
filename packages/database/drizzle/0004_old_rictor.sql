ALTER TABLE "users" ADD COLUMN "first_name" varchar(80);--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "last_name" varchar(80);--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "contact_no" varchar(32);--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "occupation" varchar(40);--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "organization_name" varchar(120);--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "onboarding_completed" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "email_verification_token" text;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "email_verification_expires_at" timestamp;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "subscription_plan" varchar(40) DEFAULT 'starter' NOT NULL;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "subscription_status" varchar(40) DEFAULT 'active' NOT NULL;