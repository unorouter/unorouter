CREATE TABLE `conversations` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` integer NOT NULL,
	`title` text,
	`model` text NOT NULL,
	`share_id` text,
	`total_input_tokens` integer DEFAULT 0 NOT NULL,
	`total_output_tokens` integer DEFAULT 0 NOT NULL,
	`total_cost` real DEFAULT 0 NOT NULL,
	`created_at` integer DEFAULT (unixepoch() * 1000) NOT NULL,
	`updated_at` integer DEFAULT (unixepoch() * 1000) NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `conversations_share_id_unique` ON `conversations` (`share_id`);--> statement-breakpoint
CREATE INDEX `idx_conv_user_updated` ON `conversations` (`user_id`,`updated_at`);--> statement-breakpoint
CREATE INDEX `idx_conv_share` ON `conversations` (`share_id`);--> statement-breakpoint
CREATE TABLE `media` (
	`id` text PRIMARY KEY NOT NULL,
	`msg_id` text NOT NULL,
	`r2_key` text NOT NULL,
	`mime_type` text NOT NULL,
	`size_bytes` integer NOT NULL,
	`created_at` integer DEFAULT (unixepoch() * 1000) NOT NULL,
	FOREIGN KEY (`msg_id`) REFERENCES `messages`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `idx_media_msg` ON `media` (`msg_id`);--> statement-breakpoint
CREATE TABLE `messages` (
	`id` text PRIMARY KEY NOT NULL,
	`conv_id` text NOT NULL,
	`role` text NOT NULL,
	`model` text,
	`parts` text NOT NULL,
	`request_id` text,
	`input_tokens` integer,
	`output_tokens` integer,
	`cost` real,
	`raw_response` text,
	`created_at` integer DEFAULT (unixepoch() * 1000) NOT NULL,
	FOREIGN KEY (`conv_id`) REFERENCES `conversations`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `idx_msg_conv` ON `messages` (`conv_id`);