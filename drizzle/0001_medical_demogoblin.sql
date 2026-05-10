ALTER TABLE `generations` ADD `share_id` text;--> statement-breakpoint
CREATE UNIQUE INDEX `generations_share_id_unique` ON `generations` (`share_id`);--> statement-breakpoint
CREATE INDEX `idx_gen_share` ON `generations` (`share_id`);