CREATE TABLE `market_media` (
	`id` text PRIMARY KEY NOT NULL,
	`owner_id` text NOT NULL,
	`kind` text NOT NULL,
	`object_key` text NOT NULL,
	`content_type` text NOT NULL,
	`status` text DEFAULT 'pending' NOT NULL,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`owner_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `pawn_listings` (
	`id` text PRIMARY KEY NOT NULL,
	`seller_id` text NOT NULL,
	`title` text NOT NULL,
	`description` text NOT NULL,
	`category` text NOT NULL,
	`condition` text NOT NULL,
	`price` integer NOT NULL,
	`photo_id` text,
	`status` text DEFAULT 'pending' NOT NULL,
	`available` integer DEFAULT 1 NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	FOREIGN KEY (`seller_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `pawn_status_created` ON `pawn_listings` (`status`,`created_at`);--> statement-breakpoint
CREATE INDEX `pawn_seller` ON `pawn_listings` (`seller_id`);--> statement-breakpoint
ALTER TABLE `listings` ADD `moderation_status` text DEFAULT 'approved' NOT NULL;--> statement-breakpoint
ALTER TABLE `packet_photos` ADD `review_status` text DEFAULT 'approved' NOT NULL;--> statement-breakpoint
ALTER TABLE `product_catalog` ADD `moderation_status` text DEFAULT 'approved' NOT NULL;--> statement-breakpoint
ALTER TABLE `users` ADD `upi_qr_id` text;