CREATE TABLE `acp_checkout_sessions` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` integer NOT NULL,
	`status` text NOT NULL,
	`currency` text DEFAULT 'usd' NOT NULL,
	`item_id` text NOT NULL,
	`quantity` integer DEFAULT 1 NOT NULL,
	`amount_cents` integer NOT NULL,
	`payment_method` text NOT NULL,
	`pay_link` text,
	`quota_at_complete` integer,
	`body` text,
	`created_at` integer DEFAULT (unixepoch() * 1000) NOT NULL,
	`updated_at` integer DEFAULT (unixepoch() * 1000) NOT NULL
);
--> statement-breakpoint
CREATE INDEX `idx_acp_user_created` ON `acp_checkout_sessions` (`user_id`,`created_at`);--> statement-breakpoint
CREATE TABLE `acp_idempotency_keys` (
	`key` text NOT NULL,
	`user_id` integer NOT NULL,
	`path` text NOT NULL,
	`body_hash` text NOT NULL,
	`status` integer NOT NULL,
	`response` text NOT NULL,
	`state` text DEFAULT 'done' NOT NULL,
	`created_at` integer DEFAULT (unixepoch() * 1000) NOT NULL
);
--> statement-breakpoint
CREATE INDEX `idx_acp_idem_lookup` ON `acp_idempotency_keys` (`user_id`,`key`,`path`);--> statement-breakpoint
CREATE INDEX `idx_acp_idem_created` ON `acp_idempotency_keys` (`created_at`);--> statement-breakpoint
CREATE TABLE `conversations` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` integer NOT NULL,
	`title` text,
	`model` text NOT NULL,
	`share_id` text,
	`total_input_tokens` integer DEFAULT 0 NOT NULL,
	`total_output_tokens` integer DEFAULT 0 NOT NULL,
	`total_cost` real DEFAULT 0 NOT NULL,
	`archived_at` integer,
	`starred_at` integer,
	`created_at` integer DEFAULT (unixepoch() * 1000) NOT NULL,
	`updated_at` integer DEFAULT (unixepoch() * 1000) NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `conversations_share_id_unique` ON `conversations` (`share_id`);--> statement-breakpoint
CREATE INDEX `idx_conv_user_updated` ON `conversations` (`user_id`,`updated_at`);--> statement-breakpoint
CREATE INDEX `idx_conv_share` ON `conversations` (`share_id`);--> statement-breakpoint
CREATE INDEX `idx_conv_archived` ON `conversations` (`user_id`,`archived_at`);--> statement-breakpoint
CREATE INDEX `idx_conv_starred` ON `conversations` (`user_id`,`starred_at`);--> statement-breakpoint
CREATE TABLE `media` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` integer NOT NULL,
	`conv_id` text NOT NULL,
	`r2_key` text NOT NULL,
	`mime_type` text NOT NULL,
	`size_bytes` integer NOT NULL,
	`extracted_text` text,
	`created_at` integer DEFAULT (unixepoch() * 1000) NOT NULL,
	FOREIGN KEY (`conv_id`) REFERENCES `conversations`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `idx_media_user` ON `media` (`user_id`);--> statement-breakpoint
CREATE INDEX `idx_media_conv` ON `media` (`conv_id`);--> statement-breakpoint
CREATE TABLE `messages` (
	`id` text PRIMARY KEY NOT NULL,
	`conv_id` text NOT NULL,
	`parent_id` text,
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
CREATE INDEX `idx_msg_conv` ON `messages` (`conv_id`);--> statement-breakpoint
CREATE INDEX `idx_msg_parent` ON `messages` (`conv_id`,`parent_id`);--> statement-breakpoint
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