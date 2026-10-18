CREATE TABLE `packet_cache` (
	`product_key` text PRIMARY KEY NOT NULL,
	`photo_id` text,
	`status` text NOT NULL,
	`retry_after` integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE `packet_photos` (
	`id` text PRIMARY KEY NOT NULL,
	`object_key` text NOT NULL,
	`content_type` text NOT NULL,
	`source` text NOT NULL,
	`source_url` text,
	`credit` text NOT NULL,
	`license` text,
	`matched_name` text NOT NULL,
	`uploaded_by` text,
	`created_at` integer NOT NULL
);
--> statement-breakpoint
ALTER TABLE `listings` ADD `mrp` integer;--> statement-breakpoint
ALTER TABLE `listings` ADD `photo_id` text;