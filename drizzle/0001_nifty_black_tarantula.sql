CREATE TABLE `moderation_log` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` integer NOT NULL,
	`conv_id` text,
	`model` text NOT NULL,
	`media_type` text NOT NULL,
	`decision` text NOT NULL,
	`reason` text,
	`prompt` text NOT NULL,
	`external_id` text NOT NULL,
	`creem_id` text,
	`units` integer,
	`latency_ms` integer NOT NULL,
	`created_at` integer DEFAULT (unixepoch() * 1000) NOT NULL
);
--> statement-breakpoint
CREATE INDEX `idx_modlog_user_created` ON `moderation_log` (`user_id`,`created_at`);--> statement-breakpoint
CREATE INDEX `idx_modlog_decision` ON `moderation_log` (`decision`,`created_at`);