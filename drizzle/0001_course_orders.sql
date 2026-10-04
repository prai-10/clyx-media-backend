CREATE TABLE "course_orders" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"ref" varchar(16) NOT NULL,
	"name" varchar(120) NOT NULL,
	"phone" varchar(20) DEFAULT '' NOT NULL,
	"course_id" varchar(64) DEFAULT '' NOT NULL,
	"course_title" varchar(200) NOT NULL,
	"amount" numeric(10, 2) NOT NULL,
	"payment_ref" varchar(40) NOT NULL,
	"status" varchar(20) DEFAULT 'submitted' NOT NULL,
	"admin_note" text DEFAULT '' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "course_orders_ref_unique" UNIQUE("ref"),
	CONSTRAINT "course_orders_payment_ref_unique" UNIQUE("payment_ref")
);
--> statement-breakpoint
ALTER TABLE "course_orders" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE INDEX "course_orders_status_created_idx" ON "course_orders" USING btree ("status","created_at");--> statement-breakpoint
CREATE INDEX "course_orders_created_idx" ON "course_orders" USING btree ("created_at");