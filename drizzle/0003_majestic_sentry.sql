CREATE TABLE `product_photo_defaults` (
	`product_group` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`category` text NOT NULL,
	`photo_id` text NOT NULL,
	`selected_by` text NOT NULL,
	`updated_at` integer NOT NULL
);
--> statement-breakpoint
ALTER TABLE `packet_photos` ADD `product_group` text;--> statement-breakpoint
ALTER TABLE `packet_photos` ADD `category` text;