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
CREATE TABLE `characters` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` integer NOT NULL,
	`name` text NOT NULL,
	`avatar_r2_key` text,
	`description` text,
	`personality` text,
	`scenario` text,
	`first_message` text,
	`example_messages` text,
	`system_prompt` text,
	`post_history_instructions` text,
	`default_reasoning_effort` text,
	`tags` text,
	`nsfw` integer DEFAULT false NOT NULL,
	`created_at` integer DEFAULT (unixepoch() * 1000) NOT NULL,
	`updated_at` integer DEFAULT (unixepoch() * 1000) NOT NULL
);
--> statement-breakpoint
CREATE INDEX `idx_char_user_updated` ON `characters` (`user_id`,`updated_at`);--> statement-breakpoint
CREATE INDEX `idx_char_user_name` ON `characters` (`user_id`,`name`);--> statement-breakpoint
CREATE TABLE `conversation_characters` (
	`conv_id` text NOT NULL,
	`character_id` text NOT NULL,
	`order_index` integer DEFAULT 0 NOT NULL,
	`is_active` integer DEFAULT true NOT NULL,
	`overrides` text,
	`created_at` integer DEFAULT (unixepoch() * 1000) NOT NULL,
	PRIMARY KEY(`conv_id`, `character_id`),
	FOREIGN KEY (`conv_id`) REFERENCES `conversations`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`character_id`) REFERENCES `characters`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `idx_convchar_conv_order` ON `conversation_characters` (`conv_id`,`order_index`);--> statement-breakpoint
CREATE TABLE `conversation_lorebooks` (
	`conv_id` text NOT NULL,
	`lorebook_id` text NOT NULL,
	`order_index` integer DEFAULT 0 NOT NULL,
	`created_at` integer DEFAULT (unixepoch() * 1000) NOT NULL,
	PRIMARY KEY(`conv_id`, `lorebook_id`),
	FOREIGN KEY (`conv_id`) REFERENCES `conversations`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`lorebook_id`) REFERENCES `lorebooks`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `idx_convlb_conv_order` ON `conversation_lorebooks` (`conv_id`,`order_index`);--> statement-breakpoint
CREATE TABLE `conversation_settings` (
	`conv_id` text PRIMARY KEY NOT NULL,
	`default_model` text NOT NULL,
	`persona_id` text,
	`preset_id` text,
	`system_prompt_override` text,
	`author_note` text,
	`author_note_depth` integer DEFAULT 4 NOT NULL,
	`chat_memory` integer DEFAULT 8 NOT NULL,
	`reasoning_effort` text,
	`web_search_enabled` integer DEFAULT false NOT NULL,
	`web_search_engine` text DEFAULT 'auto' NOT NULL,
	`web_search_context_size` text DEFAULT 'medium' NOT NULL,
	`temperature` real,
	`top_p` real,
	`top_k` integer,
	`min_p` real,
	`top_a` real,
	`frequency_penalty` real,
	`presence_penalty` real,
	`repetition_penalty` real,
	`max_tokens` integer,
	`extra_body` text,
	`updated_at` integer DEFAULT (unixepoch() * 1000) NOT NULL,
	FOREIGN KEY (`conv_id`) REFERENCES `conversations`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `conversations` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` integer NOT NULL,
	`title` text,
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
CREATE TABLE `lorebook_entries` (
	`id` text PRIMARY KEY NOT NULL,
	`lorebook_id` text NOT NULL,
	`keys` text NOT NULL,
	`secondary_keys` text,
	`content` text NOT NULL,
	`constant` integer DEFAULT false NOT NULL,
	`selective` integer DEFAULT false NOT NULL,
	`priority` integer DEFAULT 100 NOT NULL,
	`position` text DEFAULT 'before_char' NOT NULL,
	`depth` integer DEFAULT 4 NOT NULL,
	`enabled` integer DEFAULT true NOT NULL,
	`order_index` integer DEFAULT 0 NOT NULL,
	`created_at` integer DEFAULT (unixepoch() * 1000) NOT NULL,
	`updated_at` integer DEFAULT (unixepoch() * 1000) NOT NULL,
	FOREIGN KEY (`lorebook_id`) REFERENCES `lorebooks`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `idx_lbentry_book_enabled` ON `lorebook_entries` (`lorebook_id`,`enabled`);--> statement-breakpoint
CREATE TABLE `lorebooks` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` integer NOT NULL,
	`name` text NOT NULL,
	`description` text,
	`scan_depth` integer DEFAULT 4 NOT NULL,
	`token_budget` integer DEFAULT 1500 NOT NULL,
	`recursive_scanning` integer DEFAULT false NOT NULL,
	`created_at` integer DEFAULT (unixepoch() * 1000) NOT NULL,
	`updated_at` integer DEFAULT (unixepoch() * 1000) NOT NULL
);
--> statement-breakpoint
CREATE INDEX `idx_lorebook_user` ON `lorebooks` (`user_id`);--> statement-breakpoint
CREATE TABLE `media` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` integer NOT NULL,
	`conv_id` text,
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
CREATE TABLE `message_items` (
	`id` text PRIMARY KEY NOT NULL,
	`message_id` text NOT NULL,
	`sequence_index` integer NOT NULL,
	`output_index` integer,
	`type` text NOT NULL,
	`data` text NOT NULL,
	`created_at` integer DEFAULT (unixepoch() * 1000) NOT NULL,
	FOREIGN KEY (`message_id`) REFERENCES `messages`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `idx_msgitem_msg_seq` ON `message_items` (`message_id`,`sequence_index`);--> statement-breakpoint
CREATE TABLE `messages` (
	`id` text PRIMARY KEY NOT NULL,
	`conv_id` text NOT NULL,
	`parent_id` text,
	`character_id` text,
	`role` text NOT NULL,
	`model` text,
	`generation_id` text,
	`input_tokens` integer,
	`output_tokens` integer,
	`cost` real,
	`duration_ms` integer,
	`tokens_per_second` real,
	`branch_index` integer DEFAULT 0 NOT NULL,
	`is_active_branch` integer DEFAULT true NOT NULL,
	`is_edited` integer DEFAULT false NOT NULL,
	`created_at` integer DEFAULT (unixepoch() * 1000) NOT NULL,
	`updated_at` integer DEFAULT (unixepoch() * 1000) NOT NULL,
	FOREIGN KEY (`conv_id`) REFERENCES `conversations`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `idx_msg_conv_parent` ON `messages` (`conv_id`,`parent_id`);--> statement-breakpoint
CREATE INDEX `idx_msg_conv_created` ON `messages` (`conv_id`,`created_at`);--> statement-breakpoint
CREATE INDEX `idx_msg_parent_branch` ON `messages` (`parent_id`,`branch_index`);--> statement-breakpoint
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
CREATE INDEX `idx_modlog_decision` ON `moderation_log` (`decision`,`created_at`);--> statement-breakpoint
CREATE TABLE `personas` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` integer NOT NULL,
	`name` text NOT NULL,
	`description` text,
	`avatar_r2_key` text,
	`is_default` integer DEFAULT false NOT NULL,
	`created_at` integer DEFAULT (unixepoch() * 1000) NOT NULL,
	`updated_at` integer DEFAULT (unixepoch() * 1000) NOT NULL
);
--> statement-breakpoint
CREATE INDEX `idx_persona_user_default` ON `personas` (`user_id`,`is_default`);--> statement-breakpoint
CREATE INDEX `idx_persona_user` ON `personas` (`user_id`);--> statement-breakpoint
CREATE TABLE `sampling_presets` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` integer NOT NULL,
	`name` text NOT NULL,
	`temperature` real,
	`top_p` real,
	`top_k` integer,
	`min_p` real,
	`top_a` real,
	`frequency_penalty` real,
	`presence_penalty` real,
	`repetition_penalty` real,
	`max_tokens` integer,
	`extra_body` text,
	`is_default` integer DEFAULT false NOT NULL,
	`created_at` integer DEFAULT (unixepoch() * 1000) NOT NULL,
	`updated_at` integer DEFAULT (unixepoch() * 1000) NOT NULL
);
--> statement-breakpoint
CREATE INDEX `idx_preset_user_name` ON `sampling_presets` (`user_id`,`name`);