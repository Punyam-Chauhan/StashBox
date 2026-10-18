ALTER TABLE `users` ADD `room_label` text;--> statement-breakpoint
ALTER TABLE `users` ADD `hostel` text;--> statement-breakpoint
ALTER TABLE `users` ADD `wing` text;--> statement-breakpoint
ALTER TABLE `users` ADD `phase` text;--> statement-breakpoint
CREATE INDEX `users_hostel_confirmed` ON `users` (`hostel`,`confirmed_at`);