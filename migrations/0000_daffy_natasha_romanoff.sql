CREATE TABLE "deposits" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" varchar NOT NULL,
	"amount" numeric(18, 8) NOT NULL,
	"requested_amount" numeric(18, 8),
	"payable_amount" numeric(18, 8),
	"wallet_address" text,
	"expires_at" timestamp,
	"status" text DEFAULT 'pending' NOT NULL,
	"tx_hash" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"confirmed_at" timestamp,
	"confirmed_by" varchar
);
--> statement-breakpoint
CREATE TABLE "notifications" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" varchar NOT NULL,
	"request_id" varchar,
	"type" text,
	"message" text NOT NULL,
	"metadata" jsonb,
	"is_read" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "operators" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"login" text NOT NULL,
	"password_hash" text NOT NULL,
	"salt" varchar(64) NOT NULL,
	"is_active" integer DEFAULT 1 NOT NULL,
	"is_online" integer DEFAULT 0 NOT NULL,
	"last_activity_at" timestamp,
	"chat_id" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "operators_login_unique" UNIQUE("login")
);
--> statement-breakpoint
CREATE TABLE "payment_requests" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" varchar NOT NULL,
	"amount_rub" numeric(18, 2) NOT NULL,
	"amount_usdt" numeric(18, 8) NOT NULL,
	"frozen_rate" numeric(18, 2) NOT NULL,
	"urgency" text NOT NULL,
	"has_urgent_fee" integer DEFAULT 0 NOT NULL,
	"attachments" jsonb,
	"comment" text,
	"status" text DEFAULT 'submitted' NOT NULL,
	"receipt" jsonb,
	"admin_comment" text,
	"assigned_operator_id" varchar,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "tron_scan_state" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"last_processed_block_number" text DEFAULT '0' NOT NULL,
	"last_processed_timestamp" timestamp DEFAULT now() NOT NULL,
	"last_successful_scan" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"telegram_id" text NOT NULL,
	"username" text NOT NULL,
	"chat_id" text,
	"available_balance" numeric(18, 8) DEFAULT '0' NOT NULL,
	"frozen_balance" numeric(18, 8) DEFAULT '0' NOT NULL,
	"registered_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "users_telegram_id_unique" UNIQUE("telegram_id")
);
