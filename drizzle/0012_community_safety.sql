CREATE TABLE `reports` (
	`id` text PRIMARY KEY NOT NULL,
	`reporter_id` text,
	`target_kind` text NOT NULL,
	`target_id` text NOT NULL,
	`target_label` text NOT NULL,
	`reason` text NOT NULL,
	`details` text NOT NULL,
	`status` text DEFAULT 'open' NOT NULL,
	`resolution` text DEFAULT '' NOT NULL,
	`reviewed_by` text,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	FOREIGN KEY (`reporter_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE set null,
	CONSTRAINT "reports_kind" CHECK("reports"."target_kind" IN ('snack','pawn','stasher')),
	CONSTRAINT "reports_status" CHECK("reports"."status" IN ('open','resolved','dismissed'))
);
--> statement-breakpoint
CREATE UNIQUE INDEX `reports_pending` ON `reports` (`reporter_id`,`target_kind`,`target_id`) WHERE "reports"."status"='open';--> statement-breakpoint
CREATE INDEX `reports_status_created` ON `reports` (`status`,`created_at`);--> statement-breakpoint
CREATE TABLE `staff_notification_reads` (
	`notification_id` integer NOT NULL,
	`user_id` text NOT NULL,
	PRIMARY KEY(`notification_id`, `user_id`),
	FOREIGN KEY (`notification_id`) REFERENCES `staff_notifications`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `staff_notifications` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`kind` text NOT NULL,
	`subject_id` text NOT NULL,
	`title` text NOT NULL,
	`created_at` integer NOT NULL
);
--> statement-breakpoint
ALTER TABLE `users` ADD `username` text;--> statement-breakpoint
ALTER TABLE `users` ADD `blocked` integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE `users` ADD `blocked_reason` text DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE `users` ADD `permissions` text DEFAULT '[]' NOT NULL;--> statement-breakpoint
ALTER TABLE `users` ADD `deletion_pending` integer DEFAULT 0 NOT NULL;--> statement-breakpoint
CREATE UNIQUE INDEX `users_username_unique` ON `users` (lower("username"));
--> statement-breakpoint
UPDATE users SET username='stasher_' || student_id WHERE LENGTH(student_id)=5 AND student_id NOT GLOB '*[^0-9]*';
--> statement-breakpoint
UPDATE users SET username='stasher_' || substr(replace(id,'-',''),1,16) WHERE username IS NULL;
--> statement-breakpoint
UPDATE users SET username='punyam' WHERE role='admin';
--> statement-breakpoint
CREATE TRIGGER require_account_identity BEFORE INSERT ON users WHEN
 NEW.username IS NULL OR length(NEW.username)<3 OR length(NEW.username)>24 OR NEW.username GLOB '*[^a-z0-9_]*' OR substr(NEW.username,1,1) NOT GLOB '[a-z]' OR length(NEW.student_id)!=5 OR NEW.student_id GLOB '*[^0-9]*'
BEGIN SELECT RAISE(ABORT,'Invalid account identity'); END;
--> statement-breakpoint
CREATE TRIGGER notify_signup AFTER INSERT ON users BEGIN
 INSERT INTO staff_notifications(kind,subject_id,title,created_at) VALUES ('account',NEW.id,'New account: ' || NEW.name,NEW.created_at);
END;
--> statement-breakpoint
CREATE TRIGGER notify_snack AFTER INSERT ON listings BEGIN
 INSERT INTO staff_notifications(kind,subject_id,title,created_at) VALUES ('listing',NEW.id,'Snack added: ' || NEW.name,NEW.updated_at);
END;
--> statement-breakpoint
CREATE TRIGGER notify_product AFTER INSERT ON product_catalog BEGIN
 INSERT INTO staff_notifications(kind,subject_id,title,created_at) VALUES ('product',NEW.product_group,'Product added: ' || NEW.name,NEW.created_at);
END;
--> statement-breakpoint
CREATE TRIGGER trim_staff_notifications AFTER INSERT ON staff_notifications BEGIN
 DELETE FROM staff_notifications WHERE id < NEW.id - 2000;
END;
--> statement-breakpoint
CREATE TRIGGER notify_pawn AFTER INSERT ON pawn_listings BEGIN
 INSERT INTO staff_notifications(kind,subject_id,title,created_at) VALUES ('listing',NEW.id,'Pawn item added: ' || NEW.title,NEW.created_at);
END;
--> statement-breakpoint
CREATE TRIGGER notify_report AFTER INSERT ON reports BEGIN
 INSERT INTO staff_notifications(kind,subject_id,title,created_at) VALUES ('report',NEW.id,'New report: ' || NEW.target_label,NEW.created_at);
END;
