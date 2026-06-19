CREATE TABLE `chat_groups` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` integer NOT NULL,
	`name` text NOT NULL,
	`order_index` integer DEFAULT 0 NOT NULL,
	`folded` integer DEFAULT false NOT NULL,
	`sync_expires_at` integer,
	`created_at` integer DEFAULT (unixepoch() * 1000) NOT NULL,
	`updated_at` integer DEFAULT (unixepoch() * 1000) NOT NULL
);
--> statement-breakpoint
CREATE INDEX `idx_chat_group_user_order` ON `chat_groups` (`user_id`,`order_index`);--> statement-breakpoint
ALTER TABLE `conversations` ADD `group_id` text;--> statement-breakpoint
CREATE INDEX `idx_conv_user_group` ON `conversations` (`user_id`,`group_id`);
