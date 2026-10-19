CREATE TABLE `seller_books` (
	`seller_id` text PRIMARY KEY NOT NULL,
	`revision` integer DEFAULT 0 NOT NULL,
	FOREIGN KEY (`seller_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `seller_ledger` (
	`id` text PRIMARY KEY NOT NULL,
	`seller_id` text NOT NULL,
	`product_key` text NOT NULL,
	`name` text NOT NULL,
	`kind` text NOT NULL,
	`quantity` integer NOT NULL,
	`unit_price` integer NOT NULL,
	`entry_date` text NOT NULL,
	`notes` text DEFAULT '' NOT NULL,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`seller_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `seller_ledger_owner_date` ON `seller_ledger` (`seller_id`,`entry_date`);--> statement-breakpoint
ALTER TABLE `users` ADD `shop_sleeping` integer DEFAULT 0 NOT NULL;