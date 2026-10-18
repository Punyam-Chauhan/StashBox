CREATE TABLE `audit` (
	`id` text PRIMARY KEY NOT NULL,
	`actor` text NOT NULL,
	`target` text NOT NULL,
	`action` text NOT NULL,
	`created_at` integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE `listings` (
	`id` text PRIMARY KEY NOT NULL,
	`seller_id` text NOT NULL,
	`product_key` text NOT NULL,
	`name` text NOT NULL,
	`size` text NOT NULL,
	`category` text NOT NULL,
	`price` integer NOT NULL,
	`available` integer DEFAULT 1 NOT NULL,
	`updated_at` integer NOT NULL,
	FOREIGN KEY (`seller_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `listings_seller` ON `listings` (`seller_id`);--> statement-breakpoint
CREATE UNIQUE INDEX `listing_product_seller` ON `listings` (`seller_id`,`product_key`);--> statement-breakpoint
CREATE TABLE `rate_limits` (
	`key` text PRIMARY KEY NOT NULL,
	`count` integer NOT NULL,
	`expires_at` integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE `sessions` (
	`token_hash` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`expires_at` integer NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `sessions_user` ON `sessions` (`user_id`);--> statement-breakpoint
CREATE INDEX `sessions_expiry` ON `sessions` (`expires_at`);--> statement-breakpoint
CREATE TABLE `users` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`email` text NOT NULL,
	`student_id` text NOT NULL,
	`phone` text NOT NULL,
	`room` integer NOT NULL,
	`password_hash` text NOT NULL,
	`salt` text NOT NULL,
	`show_phone` integer DEFAULT 0 NOT NULL,
	`is_open` integer DEFAULT 1 NOT NULL,
	`role` text DEFAULT 'seller' NOT NULL,
	`must_change_password` integer DEFAULT 0 NOT NULL,
	`confirmed_at` integer NOT NULL,
	`created_at` integer NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `users_email_unique` ON `users` (`email`);--> statement-breakpoint
CREATE UNIQUE INDEX `users_student_id_unique` ON `users` (`student_id`);--> statement-breakpoint
CREATE INDEX `users_confirmed` ON `users` (`confirmed_at`);