ALTER TABLE `chat_groups` ADD `parent_id` text;--> statement-breakpoint
CREATE INDEX `idx_chat_group_parent` ON `chat_groups` (`parent_id`);