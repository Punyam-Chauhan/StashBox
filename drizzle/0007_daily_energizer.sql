CREATE TABLE `image_storage` (
	`id` text PRIMARY KEY NOT NULL,
	`object_key` text NOT NULL,
	`byte_size` integer NOT NULL,
	`created_at` integer NOT NULL
);
--> statement-breakpoint
-- Existing uploads were capped at 750 KB. Reserve that upper bound rather than
-- undercount older objects; new writes record their actual compressed bytes.
INSERT OR IGNORE INTO image_storage (id,object_key,byte_size,created_at) SELECT id,object_key,750000,created_at FROM packet_photos;
--> statement-breakpoint
INSERT OR IGNORE INTO image_storage (id,object_key,byte_size,created_at) SELECT id,object_key,750000,created_at FROM market_media;
