CREATE TABLE `voice_settings` (
	`id` text PRIMARY KEY NOT NULL,
	`api_key` text DEFAULT '' NOT NULL,
	`model` text DEFAULT 's2.1-pro-free' NOT NULL,
	`voice_id` text,
	`narrator_voice_id` text,
	`read_mode` text DEFAULT 'all' NOT NULL,
	`speed` real DEFAULT 1 NOT NULL,
	`volume` real DEFAULT 0 NOT NULL,
	`autoplay` integer DEFAULT false NOT NULL,
	`created_at` integer DEFAULT (unixepoch() * 1000) NOT NULL,
	`updated_at` integer DEFAULT (unixepoch() * 1000) NOT NULL
);
--> statement-breakpoint
ALTER TABLE `characters` ADD `voice_id` text;