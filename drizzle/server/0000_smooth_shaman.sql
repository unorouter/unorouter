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
	`avatar_media_id` text,
	`background_media_id` text,
	`description` text,
	`personality` text,
	`scenario` text,
	`first_message` text,
	`alternate_greetings` text,
	`example_messages` text,
	`system_prompt` text,
	`post_history_instructions` text,
	`default_reasoning_effort` text,
	`tags` text,
	`triggers` text,
	`turn_triggers` text,
	`regex_scripts` text,
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
CREATE TABLE `conversation_characters` (
	`conv_id` text NOT NULL,
	`character_id` text NOT NULL,
	`order_index` integer DEFAULT 0 NOT NULL,
	`is_active` integer DEFAULT true NOT NULL,
	`talkness` real,
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
CREATE TABLE `conversations` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` integer NOT NULL,
	`title` text,
	`total_input_tokens` integer DEFAULT 0 NOT NULL,
	`total_output_tokens` integer DEFAULT 0 NOT NULL,
	`total_cost` real DEFAULT 0 NOT NULL,
	`default_model` text NOT NULL,
	`persona_id` text,
	`preset_id` text,
	`system_prompt_override` text,
	`author_note` text,
	`author_note_depth` integer DEFAULT 4 NOT NULL,
	`chat_memory` integer,
	`reasoning_effort` text,
	`web_search_enabled` integer DEFAULT false NOT NULL,
	`web_search_engine` text DEFAULT 'auto' NOT NULL,
	`web_search_context_size` text DEFAULT 'medium' NOT NULL,
	`group` text,
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
	`vars` text,
	`streaming_enabled` integer,
	`show_reasoning` integer,
	`group_order_by_order` integer,
	`auto_continue` integer,
	`summary_memory` text,
	`summary_anchor` integer,
	`memory_enabled` integer,
	`first_msg_index` integer DEFAULT -1 NOT NULL,
	`group_id` text,
	`sync_expires_at` integer,
	`created_at` integer DEFAULT (unixepoch() * 1000) NOT NULL,
	`updated_at` integer DEFAULT (unixepoch() * 1000) NOT NULL
);
--> statement-breakpoint
CREATE INDEX `idx_conv_user_updated` ON `conversations` (`user_id`,`updated_at`);--> statement-breakpoint
CREATE INDEX `idx_conv_sync_expires` ON `conversations` (`sync_expires_at`);--> statement-breakpoint
CREATE INDEX `idx_conv_user_group` ON `conversations` (`user_id`,`group_id`);--> statement-breakpoint
CREATE TABLE `lorebook_entries` (
	`id` text PRIMARY KEY NOT NULL,
	`lorebook_id` text NOT NULL,
	`keys` text NOT NULL,
	`secondary_keys` text,
	`content` text NOT NULL,
	`constant` integer DEFAULT false NOT NULL,
	`selective` integer DEFAULT false NOT NULL,
	`priority` integer DEFAULT 100 NOT NULL,
	`enabled` integer DEFAULT true NOT NULL,
	`order_index` integer DEFAULT 0 NOT NULL,
	`match_whole_words` integer DEFAULT false NOT NULL,
	`injection_role` text DEFAULT 'system' NOT NULL,
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
	`playground_id` text,
	`sequence_index` integer,
	`upstream_result_url` text,
	`r2_key` text,
	`r2_url` text,
	`data_base64` text,
	`mime_type` text NOT NULL,
	`size_bytes` integer NOT NULL,
	`width` integer,
	`height` integer,
	`extracted_text` text,
	`created_at` integer DEFAULT (unixepoch() * 1000) NOT NULL,
	FOREIGN KEY (`conv_id`) REFERENCES `conversations`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`playground_id`) REFERENCES `playgrounds`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `idx_media_user` ON `media` (`user_id`);--> statement-breakpoint
CREATE INDEX `idx_media_conv` ON `media` (`conv_id`);--> statement-breakpoint
CREATE INDEX `idx_media_playground` ON `media` (`playground_id`);--> statement-breakpoint
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
	`playground_id` text,
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
	FOREIGN KEY (`conv_id`) REFERENCES `conversations`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`parent_id`) REFERENCES `messages`(`id`) ON UPDATE no action ON DELETE set null
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
	`avatar_media_id` text,
	`is_default` integer DEFAULT false NOT NULL,
	`notes` text,
	`sync_expires_at` integer,
	`created_at` integer DEFAULT (unixepoch() * 1000) NOT NULL,
	`updated_at` integer DEFAULT (unixepoch() * 1000) NOT NULL
);
--> statement-breakpoint
CREATE INDEX `idx_persona_user_default` ON `personas` (`user_id`,`is_default`);--> statement-breakpoint
CREATE INDEX `idx_persona_user` ON `personas` (`user_id`);--> statement-breakpoint
CREATE INDEX `idx_persona_sync_expires` ON `personas` (`sync_expires_at`);--> statement-breakpoint
CREATE TABLE `playground_sessions` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` integer NOT NULL,
	`title` text,
	`first_model` text,
	`snapshot_count` integer DEFAULT 0 NOT NULL,
	`image_count` integer DEFAULT 0 NOT NULL,
	`expires_at` integer NOT NULL,
	`sync_expires_at` integer,
	`created_at` integer DEFAULT (unixepoch() * 1000) NOT NULL,
	`updated_at` integer DEFAULT (unixepoch() * 1000) NOT NULL
);
--> statement-breakpoint
CREATE INDEX `idx_session_user_updated` ON `playground_sessions` (`user_id`,`updated_at`);--> statement-breakpoint
CREATE INDEX `idx_session_expires` ON `playground_sessions` (`expires_at`);--> statement-breakpoint
CREATE INDEX `idx_session_sync_expires` ON `playground_sessions` (`sync_expires_at`);--> statement-breakpoint
CREATE TABLE `playgrounds` (
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
	FOREIGN KEY (`session_id`) REFERENCES `playground_sessions`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `idx_gen_session_order` ON `playgrounds` (`session_id`,`session_order`);--> statement-breakpoint
CREATE INDEX `idx_gen_visibility_created` ON `playgrounds` (`visibility`,`created_at`);--> statement-breakpoint
CREATE INDEX `idx_gen_model_created` ON `playgrounds` (`model`,`created_at`);--> statement-breakpoint
CREATE INDEX `idx_gen_task` ON `playgrounds` (`task_id`);--> statement-breakpoint
CREATE INDEX `idx_gen_remixed_from` ON `playgrounds` (`remixed_from`);--> statement-breakpoint
CREATE INDEX `idx_gen_expires` ON `playgrounds` (`expires_at`);--> statement-breakpoint
CREATE TABLE `request_logs` (
	`msg_id` text PRIMARY KEY NOT NULL,
	`conv_id` text NOT NULL,
	`request_body` text NOT NULL,
	`assembled_system` text,
	`final_messages` text NOT NULL,
	`response_headers` text,
	`dropped_params` text,
	`request_id` text,
	`input_tokens` integer,
	`output_tokens` integer,
	`cost` real,
	`duration_ms` integer,
	`tokens_per_second` real,
	`channel_name` text,
	`created_at` integer DEFAULT (unixepoch() * 1000) NOT NULL,
	FOREIGN KEY (`conv_id`) REFERENCES `conversations`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `idx_reqlog_conv` ON `request_logs` (`conv_id`);--> statement-breakpoint
CREATE INDEX `idx_reqlog_created` ON `request_logs` (`created_at`);--> statement-breakpoint
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
	`streaming_enabled` integer,
	`show_reasoning` integer,
	`chat_memory` integer,
	`extra_body` text,
	`providers` text,
	`prompt_template` text,
	`main_prompt` text,
	`post_history` text,
	`prefill` text,
	`force_alternate_roles` integer DEFAULT false NOT NULL,
	`no_system_role` integer DEFAULT false NOT NULL,
	`must_start_with_user_input` integer DEFAULT false NOT NULL,
	`gemini_block_off` integer DEFAULT false NOT NULL,
	`is_default` integer DEFAULT false NOT NULL,
	`sync_expires_at` integer,
	`created_at` integer DEFAULT (unixepoch() * 1000) NOT NULL,
	`updated_at` integer DEFAULT (unixepoch() * 1000) NOT NULL
);
--> statement-breakpoint
CREATE INDEX `idx_preset_user_name` ON `sampling_presets` (`user_id`,`name`);--> statement-breakpoint
CREATE INDEX `idx_preset_sync_expires` ON `sampling_presets` (`sync_expires_at`);--> statement-breakpoint
CREATE TABLE `user_themes` (
	`user_id` integer PRIMARY KEY NOT NULL,
	`theme_json` text NOT NULL,
	`sync_expires_at` integer,
	`created_at` integer DEFAULT (unixepoch() * 1000) NOT NULL,
	`updated_at` integer DEFAULT (unixepoch() * 1000) NOT NULL
);
--> statement-breakpoint
CREATE INDEX `idx_theme_sync_expires` ON `user_themes` (`sync_expires_at`);--> statement-breakpoint
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
CREATE UNIQUE INDEX `uq_acp_idem_key` ON `acp_idempotency_keys` (`user_id`,`key`,`path`);--> statement-breakpoint
CREATE INDEX `idx_acp_idem_created` ON `acp_idempotency_keys` (`created_at`);--> statement-breakpoint
CREATE TABLE `embedding_catalog` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`source` text NOT NULL,
	`source_id` text NOT NULL,
	`filename` text NOT NULL,
	`base_model` text NOT NULL,
	`category` text NOT NULL,
	`description` text,
	`thumbnail_r2_key` text,
	`visible` integer DEFAULT true NOT NULL,
	`sort_order` integer DEFAULT 0 NOT NULL,
	`created_at` integer DEFAULT (unixepoch() * 1000) NOT NULL,
	`updated_at` integer DEFAULT (unixepoch() * 1000) NOT NULL
);
--> statement-breakpoint
CREATE INDEX `idx_embedding_basemodel_visible` ON `embedding_catalog` (`base_model`,`visible`);--> statement-breakpoint
CREATE INDEX `idx_embedding_category` ON `embedding_catalog` (`category`);--> statement-breakpoint
CREATE TABLE `lora_catalog` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`source` text NOT NULL,
	`source_id` text NOT NULL,
	`filename` text NOT NULL,
	`base_model` text NOT NULL,
	`category` text NOT NULL,
	`default_weight` real DEFAULT 1 NOT NULL,
	`description` text,
	`thumbnail_r2_key` text,
	`visible` integer DEFAULT true NOT NULL,
	`sort_order` integer DEFAULT 0 NOT NULL,
	`created_at` integer DEFAULT (unixepoch() * 1000) NOT NULL,
	`updated_at` integer DEFAULT (unixepoch() * 1000) NOT NULL
);
--> statement-breakpoint
CREATE INDEX `idx_lora_basemodel_visible` ON `lora_catalog` (`base_model`,`visible`);--> statement-breakpoint
CREATE INDEX `idx_lora_category` ON `lora_catalog` (`category`);--> statement-breakpoint
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
CREATE TABLE `upscaler_catalog` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`filename` text NOT NULL,
	`category` text NOT NULL,
	`native_scale` integer DEFAULT 4 NOT NULL,
	`description` text,
	`visible` integer DEFAULT true NOT NULL,
	`sort_order` integer DEFAULT 0 NOT NULL,
	`created_at` integer DEFAULT (unixepoch() * 1000) NOT NULL,
	`updated_at` integer DEFAULT (unixepoch() * 1000) NOT NULL
);
--> statement-breakpoint
CREATE INDEX `idx_upscaler_category_visible` ON `upscaler_catalog` (`category`,`visible`);