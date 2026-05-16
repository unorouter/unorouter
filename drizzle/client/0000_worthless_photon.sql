CREATE TABLE `card_characters` (
	`card_id` text NOT NULL,
	`character_id` text NOT NULL,
	`order_index` integer DEFAULT 0 NOT NULL,
	PRIMARY KEY(`card_id`, `character_id`),
	FOREIGN KEY (`card_id`) REFERENCES `cards`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`character_id`) REFERENCES `characters`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `idx_cardchar_card_order` ON `card_characters` (`card_id`,`order_index`);--> statement-breakpoint
CREATE TABLE `card_lorebooks` (
	`card_id` text NOT NULL,
	`lorebook_id` text NOT NULL,
	`order_index` integer DEFAULT 0 NOT NULL,
	PRIMARY KEY(`card_id`, `lorebook_id`),
	FOREIGN KEY (`card_id`) REFERENCES `cards`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`lorebook_id`) REFERENCES `lorebooks`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `idx_cardlb_card_order` ON `card_lorebooks` (`card_id`,`order_index`);--> statement-breakpoint
CREATE TABLE `cards` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` integer NOT NULL,
	`name` text NOT NULL,
	`description` text,
	`persona_id` text,
	`sync_expires_at` integer,
	`created_at` integer DEFAULT (unixepoch() * 1000) NOT NULL,
	`updated_at` integer DEFAULT (unixepoch() * 1000) NOT NULL
);
--> statement-breakpoint
CREATE INDEX `idx_card_user_updated` ON `cards` (`user_id`,`updated_at`);--> statement-breakpoint
CREATE INDEX `idx_card_sync_expires` ON `cards` (`sync_expires_at`);--> statement-breakpoint
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
	`triggers` text,
	`always_active` integer DEFAULT true NOT NULL,
	`match_whole_words` integer DEFAULT false NOT NULL,
	`sync_expires_at` integer,
	`created_at` integer DEFAULT (unixepoch() * 1000) NOT NULL,
	`updated_at` integer DEFAULT (unixepoch() * 1000) NOT NULL
);
--> statement-breakpoint
CREATE INDEX `idx_char_user_updated` ON `characters` (`user_id`,`updated_at`);--> statement-breakpoint
CREATE INDEX `idx_char_user_name` ON `characters` (`user_id`,`name`);--> statement-breakpoint
CREATE INDEX `idx_char_sync_expires` ON `characters` (`sync_expires_at`);--> statement-breakpoint
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
	`streaming_enabled` integer DEFAULT true NOT NULL,
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
	`sync_expires_at` integer,
	`created_at` integer DEFAULT (unixepoch() * 1000) NOT NULL,
	`updated_at` integer DEFAULT (unixepoch() * 1000) NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `conversations_share_id_unique` ON `conversations` (`share_id`);--> statement-breakpoint
CREATE INDEX `idx_conv_user_updated` ON `conversations` (`user_id`,`updated_at`);--> statement-breakpoint
CREATE INDEX `idx_conv_share` ON `conversations` (`share_id`);--> statement-breakpoint
CREATE INDEX `idx_conv_sync_expires` ON `conversations` (`sync_expires_at`);--> statement-breakpoint
CREATE TABLE `generation_images` (
	`generation_id` text NOT NULL,
	`sequence_index` integer NOT NULL,
	`upstream_result_url` text,
	`r2_url` text NOT NULL,
	`r2_key` text NOT NULL,
	`mime_type` text DEFAULT 'image/png',
	`width` integer,
	`height` integer,
	`size_bytes` integer,
	`created_at` integer DEFAULT (unixepoch() * 1000) NOT NULL,
	PRIMARY KEY(`generation_id`, `sequence_index`),
	FOREIGN KEY (`generation_id`) REFERENCES `generations`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `idx_genimg_generation_id` ON `generation_images` (`generation_id`);--> statement-breakpoint
CREATE TABLE `generation_likes` (
	`generation_id` text NOT NULL,
	`user_id` integer NOT NULL,
	`created_at` integer DEFAULT (unixepoch() * 1000) NOT NULL,
	PRIMARY KEY(`generation_id`, `user_id`),
	FOREIGN KEY (`generation_id`) REFERENCES `generations`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `idx_likes_user` ON `generation_likes` (`user_id`);--> statement-breakpoint
CREATE TABLE `generation_sessions` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` integer NOT NULL,
	`title` text,
	`first_model` text,
	`share_id` text,
	`snapshot_count` integer DEFAULT 0 NOT NULL,
	`image_count` integer DEFAULT 0 NOT NULL,
	`expires_at` integer NOT NULL,
	`sync_expires_at` integer,
	`created_at` integer DEFAULT (unixepoch() * 1000) NOT NULL,
	`updated_at` integer DEFAULT (unixepoch() * 1000) NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `generation_sessions_share_id_unique` ON `generation_sessions` (`share_id`);--> statement-breakpoint
CREATE INDEX `idx_session_user_updated` ON `generation_sessions` (`user_id`,`updated_at`);--> statement-breakpoint
CREATE INDEX `idx_session_share` ON `generation_sessions` (`share_id`);--> statement-breakpoint
CREATE INDEX `idx_session_expires` ON `generation_sessions` (`expires_at`);--> statement-breakpoint
CREATE INDEX `idx_session_sync_expires` ON `generation_sessions` (`sync_expires_at`);--> statement-breakpoint
CREATE TABLE `generations` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` integer NOT NULL,
	`session_id` text NOT NULL,
	`session_order` integer NOT NULL,
	`requested_count` integer DEFAULT 1 NOT NULL,
	`task_id` text,
	`model` text NOT NULL,
	`prompt` text NOT NULL,
	`negative_prompt` text,
	`params` text,
	`loras` text,
	`references` text,
	`extra_params` text,
	`status` text DEFAULT 'pending' NOT NULL,
	`progress` text,
	`cost_quota` integer,
	`visibility` text DEFAULT 'private' NOT NULL,
	`nsfw` integer DEFAULT true NOT NULL,
	`flagged` integer DEFAULT false NOT NULL,
	`flag_reason` text,
	`remix_count` integer DEFAULT 0 NOT NULL,
	`like_count` integer DEFAULT 0 NOT NULL,
	`remixed_from` text,
	`error_message` text,
	`submitted_key` text,
	`created_at` integer DEFAULT (unixepoch() * 1000) NOT NULL,
	`updated_at` integer DEFAULT (unixepoch() * 1000) NOT NULL,
	`expires_at` integer NOT NULL,
	FOREIGN KEY (`session_id`) REFERENCES `generation_sessions`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `idx_gen_session_order` ON `generations` (`session_id`,`session_order`);--> statement-breakpoint
CREATE INDEX `idx_gen_visibility_created` ON `generations` (`visibility`,`created_at`);--> statement-breakpoint
CREATE INDEX `idx_gen_model_created` ON `generations` (`model`,`created_at`);--> statement-breakpoint
CREATE INDEX `idx_gen_task` ON `generations` (`task_id`);--> statement-breakpoint
CREATE INDEX `idx_gen_remixed_from` ON `generations` (`remixed_from`);--> statement-breakpoint
CREATE INDEX `idx_gen_expires` ON `generations` (`expires_at`);--> statement-breakpoint
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
	`match_whole_words` integer DEFAULT false NOT NULL,
	`injection_role` text DEFAULT 'user' NOT NULL,
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
	`sync_expires_at` integer,
	`created_at` integer DEFAULT (unixepoch() * 1000) NOT NULL,
	`updated_at` integer DEFAULT (unixepoch() * 1000) NOT NULL
);
--> statement-breakpoint
CREATE INDEX `idx_lorebook_user` ON `lorebooks` (`user_id`);--> statement-breakpoint
CREATE INDEX `idx_lorebook_sync_expires` ON `lorebooks` (`sync_expires_at`);--> statement-breakpoint
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
CREATE TABLE `personas` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` integer NOT NULL,
	`name` text NOT NULL,
	`description` text,
	`avatar_r2_key` text,
	`is_default` integer DEFAULT false NOT NULL,
	`sync_expires_at` integer,
	`created_at` integer DEFAULT (unixepoch() * 1000) NOT NULL,
	`updated_at` integer DEFAULT (unixepoch() * 1000) NOT NULL
);
--> statement-breakpoint
CREATE INDEX `idx_persona_user_default` ON `personas` (`user_id`,`is_default`);--> statement-breakpoint
CREATE INDEX `idx_persona_user` ON `personas` (`user_id`);--> statement-breakpoint
CREATE INDEX `idx_persona_sync_expires` ON `personas` (`sync_expires_at`);--> statement-breakpoint
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
	`main_prompt` text,
	`post_history` text,
	`prefill` text,
	`force_alternate_roles` integer DEFAULT false NOT NULL,
	`no_system_role` integer DEFAULT false NOT NULL,
	`must_start_with_user_input` integer DEFAULT false NOT NULL,
	`skip_prefill_if_last_is_assistant` integer DEFAULT false NOT NULL,
	`gemini_block_off` integer DEFAULT false NOT NULL,
	`is_default` integer DEFAULT false NOT NULL,
	`sync_expires_at` integer,
	`created_at` integer DEFAULT (unixepoch() * 1000) NOT NULL,
	`updated_at` integer DEFAULT (unixepoch() * 1000) NOT NULL
);
--> statement-breakpoint
CREATE INDEX `idx_preset_user_name` ON `sampling_presets` (`user_id`,`name`);--> statement-breakpoint
CREATE INDEX `idx_preset_sync_expires` ON `sampling_presets` (`sync_expires_at`);--> statement-breakpoint
CREATE TABLE `local_meta` (
	`key` text PRIMARY KEY NOT NULL,
	`value` text NOT NULL,
	`updated_at` integer DEFAULT (unixepoch() * 1000) NOT NULL
);
--> statement-breakpoint
CREATE TABLE `local_pending_sync` (
	`kind` text NOT NULL,
	`id` text NOT NULL,
	`op` text NOT NULL,
	`queued_at` integer DEFAULT (unixepoch() * 1000) NOT NULL,
	`attempts` integer DEFAULT 0 NOT NULL,
	`last_error` text,
	PRIMARY KEY(`kind`, `id`)
);
--> statement-breakpoint
CREATE INDEX `idx_pending_queued` ON `local_pending_sync` (`queued_at`);