CREATE TABLE `product_catalog` (
	`product_group` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`category` text NOT NULL,
	`created_at` integer NOT NULL
);
--> statement-breakpoint
ALTER TABLE `listings` ADD `container` text;--> statement-breakpoint
ALTER TABLE `listings` ADD `volume_ml` integer;