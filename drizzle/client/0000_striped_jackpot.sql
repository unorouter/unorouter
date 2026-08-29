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
	`name` text NOT NULL,
	`description` text,
	`persona_id` text,
	`created_at` integer DEFAULT (unixepoch() * 1000) NOT NULL,
	`updated_at` integer DEFAULT (unixepoch() * 1000) NOT NULL
);
--> statement-breakpoint
CREATE INDEX `idx_card_updated` ON `cards` (`updated_at`);--> statement-breakpoint
CREATE TABLE `characters` (
	`id` text PRIMARY KEY NOT NULL,
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
	`assets` text,
	`always_active` integer DEFAULT true NOT NULL,
	`match_whole_words` integer DEFAULT false NOT NULL,
	`created_at` integer DEFAULT (unixepoch() * 1000) NOT NULL,
	`updated_at` integer DEFAULT (unixepoch() * 1000) NOT NULL
);
--> statement-breakpoint
CREATE INDEX `idx_char_updated` ON `characters` (`updated_at`);--> statement-breakpoint
CREATE INDEX `idx_char_name` ON `characters` (`name`);--> statement-breakpoint
CREATE TABLE `chat_groups` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`order_index` integer DEFAULT 0 NOT NULL,
	`folded` integer DEFAULT false NOT NULL,
	`created_at` integer DEFAULT (unixepoch() * 1000) NOT NULL,
	`updated_at` integer DEFAULT (unixepoch() * 1000) NOT NULL
);
--> statement-breakpoint
CREATE INDEX `idx_chat_group_order` ON `chat_groups` (`order_index`);--> statement-breakpoint
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
	`auto_scroll_stream` integer,
	`show_reasoning` integer,
	`group_order_by_order` integer,
	`auto_continue` integer,
	`summary_memory` text,
	`summary_anchor` integer,
	`memory_enabled` integer,
	`utility_model` text,
	`title_model` text,
	`title_prompt` text,
	`image_enabled` integer,
	`prompt_instruction` text,
	`image_model` text,
	`image_preview` integer,
	`image_ref_ids` text,
	`use_char_avatar_ref` integer,
	`first_msg_index` integer DEFAULT -1 NOT NULL,
	`group_id` text,
	`created_at` integer DEFAULT (unixepoch() * 1000) NOT NULL,
	`updated_at` integer DEFAULT (unixepoch() * 1000) NOT NULL
);
--> statement-breakpoint
CREATE INDEX `idx_conv_updated` ON `conversations` (`updated_at`);--> statement-breakpoint
CREATE INDEX `idx_conv_group` ON `conversations` (`group_id`);--> statement-breakpoint
CREATE TABLE `lorebook_entries` (
	`id` text PRIMARY KEY NOT NULL,
	`lorebook_id` text NOT NULL,
	`comment` text,
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
	`chance` integer,
	`created_at` integer DEFAULT (unixepoch() * 1000) NOT NULL,
	`updated_at` integer DEFAULT (unixepoch() * 1000) NOT NULL,
	FOREIGN KEY (`lorebook_id`) REFERENCES `lorebooks`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `idx_lbentry_book_enabled` ON `lorebook_entries` (`lorebook_id`,`enabled`);--> statement-breakpoint
CREATE TABLE `lorebooks` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`description` text,
	`scan_depth` integer DEFAULT 4 NOT NULL,
	`token_budget` integer DEFAULT 1500 NOT NULL,
	`recursive_scanning` integer DEFAULT false NOT NULL,
	`created_at` integer DEFAULT (unixepoch() * 1000) NOT NULL,
	`updated_at` integer DEFAULT (unixepoch() * 1000) NOT NULL
);
--> statement-breakpoint
CREATE TABLE `media` (
	`id` text PRIMARY KEY NOT NULL,
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
	`prompt_text` text,
	`seed` integer,
	`created_at` integer DEFAULT (unixepoch() * 1000) NOT NULL,
	FOREIGN KEY (`conv_id`) REFERENCES `conversations`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
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
	`playground_id` text,
	`input_tokens` integer,
	`output_tokens` integer,
	`cost` real,
	`duration_ms` integer,
	`tokens_per_second` real,
	`branch_index` integer DEFAULT 0 NOT NULL,
	`is_active_branch` integer DEFAULT true NOT NULL,
	`is_edited` integer DEFAULT false NOT NULL,
	`branch_vars` text,
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
	`name` text NOT NULL,
	`title` text,
	`description` text,
	`avatar_media_id` text,
	`is_default` integer DEFAULT false NOT NULL,
	`notes` text,
	`created_at` integer DEFAULT (unixepoch() * 1000) NOT NULL,
	`updated_at` integer DEFAULT (unixepoch() * 1000) NOT NULL
);
--> statement-breakpoint
CREATE INDEX `idx_persona_default` ON `personas` (`is_default`);--> statement-breakpoint
CREATE TABLE `request_logs` (
	`msg_id` text PRIMARY KEY NOT NULL,
	`conv_id` text NOT NULL,
	`request_body` text NOT NULL,
	`assembled_system` text,
	`final_messages` text NOT NULL,
	`response_headers` text,
	`sent` text,
	`dropped_params` text,
	`request_id` text,
	`url` text,
	`endpoint` text,
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
	`tokenizer` text,
	`streaming_enabled` integer,
	`auto_scroll_stream` integer,
	`show_reasoning` integer,
	`reasoning_effort` text,
	`chat_memory` integer,
	`utility_model` text,
	`utility_group` text,
	`title_model` text,
	`title_group` text,
	`title_prompt` text,
	`memory_enabled` integer,
	`image_enabled` integer,
	`prompt_instruction` text,
	`image_model` text,
	`image_group` text,
	`image_preview` integer,
	`use_char_avatar_ref` integer,
	`extra_body` text,
	`providers` text,
	`prompt_template` text,
	`main_prompt` text,
	`post_history` text,
	`post_history_role` text,
	`prefill` text,
	`continue_prompt` text,
	`force_alternate_roles` integer DEFAULT false NOT NULL,
	`no_system_role` integer DEFAULT false NOT NULL,
	`must_start_with_user_input` integer DEFAULT false NOT NULL,
	`gemini_block_off` integer DEFAULT false NOT NULL,
	`is_default` integer DEFAULT false NOT NULL,
	`created_at` integer DEFAULT (unixepoch() * 1000) NOT NULL,
	`updated_at` integer DEFAULT (unixepoch() * 1000) NOT NULL
);
--> statement-breakpoint
CREATE INDEX `idx_preset_name` ON `sampling_presets` (`name`);--> statement-breakpoint
CREATE TABLE `user_themes` (
	`user_id` integer PRIMARY KEY DEFAULT 1 NOT NULL,
	`theme_json` text NOT NULL,
	`created_at` integer DEFAULT (unixepoch() * 1000) NOT NULL,
	`updated_at` integer DEFAULT (unixepoch() * 1000) NOT NULL
);
--> statement-breakpoint
CREATE TABLE `tester_models` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` integer NOT NULL,
	`provider_id` text NOT NULL,
	`requested_model` text NOT NULL,
	`last_detected_model` text,
	`last_verdict` text,
	`last_tested_at` integer NOT NULL,
	`created_at` integer DEFAULT (unixepoch() * 1000) NOT NULL,
	`updated_at` integer DEFAULT (unixepoch() * 1000) NOT NULL,
	FOREIGN KEY (`provider_id`) REFERENCES `tester_providers`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `uq_tester_model` ON `tester_models` (`provider_id`,`requested_model`);--> statement-breakpoint
CREATE TABLE `tester_probes` (
	`id` text PRIMARY KEY NOT NULL,
	`test_id` text NOT NULL,
	`order_index` integer DEFAULT 0 NOT NULL,
	`label` text NOT NULL,
	`prompt` text NOT NULL,
	`response_text` text,
	`http_status` integer,
	`pass` integer DEFAULT false NOT NULL,
	`transient` integer DEFAULT false NOT NULL,
	`signal` text,
	`reason` text,
	`prompt_tokens` integer,
	`completion_tokens` integer,
	`latency_ms` integer DEFAULT 0 NOT NULL,
	FOREIGN KEY (`test_id`) REFERENCES `tester_tests`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `idx_tester_probe_test` ON `tester_probes` (`test_id`,`order_index`);--> statement-breakpoint
CREATE TABLE `tester_providers` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` integer NOT NULL,
	`kind` text NOT NULL,
	`base_url_host` text NOT NULL,
	`label` text,
	`first_seen_at` integer NOT NULL,
	`last_tested_at` integer NOT NULL,
	`created_at` integer DEFAULT (unixepoch() * 1000) NOT NULL,
	`updated_at` integer DEFAULT (unixepoch() * 1000) NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `uq_tester_provider` ON `tester_providers` (`user_id`,`kind`,`base_url_host`);--> statement-breakpoint
CREATE TABLE `tester_tests` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` integer NOT NULL,
	`model_id` text NOT NULL,
	`provider_id` text NOT NULL,
	`verdict` text NOT NULL,
	`version_unverifiable` integer DEFAULT false NOT NULL,
	`detected_model` text,
	`probes_passed` integer DEFAULT 0 NOT NULL,
	`probes_total` integer DEFAULT 0 NOT NULL,
	`prompt_tokens` integer,
	`completion_tokens` integer,
	`total_tokens` integer,
	`latency_ms` integer DEFAULT 0 NOT NULL,
	`transport` text DEFAULT 'direct' NOT NULL,
	`resolved_format` text,
	`format_fell_back` integer DEFAULT false NOT NULL,
	`tested_at` integer NOT NULL,
	`published_at` integer,
	`submitter_user_id` integer,
	`submitter_username` text,
	`verified_at` integer,
	`kind` text,
	`base_url_host` text,
	`requested_model` text,
	`created_at` integer DEFAULT (unixepoch() * 1000) NOT NULL,
	`updated_at` integer DEFAULT (unixepoch() * 1000) NOT NULL,
	FOREIGN KEY (`model_id`) REFERENCES `tester_models`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `idx_tester_test_user_tested` ON `tester_tests` (`user_id`,`tested_at`);--> statement-breakpoint
CREATE INDEX `idx_tester_test_model` ON `tester_tests` (`model_id`);--> statement-breakpoint
CREATE INDEX `idx_tester_test_published` ON `tester_tests` (`published_at`);--> statement-breakpoint
CREATE INDEX `idx_tester_test_verified` ON `tester_tests` (`verified_at`);--> statement-breakpoint
CREATE INDEX `idx_tester_test_host_model` ON `tester_tests` (`base_url_host`,`requested_model`);--> statement-breakpoint
CREATE INDEX `idx_tester_test_submitter` ON `tester_tests` (`submitter_user_id`,`base_url_host`,`requested_model`);--> statement-breakpoint
CREATE TABLE `custom_providers` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`base_url` text NOT NULL,
	`api_key` text DEFAULT '' NOT NULL,
	`format` text NOT NULL,
	`proxy` integer DEFAULT false NOT NULL,
	`models` text NOT NULL,
	`created_at` integer DEFAULT (unixepoch() * 1000) NOT NULL,
	`updated_at` integer DEFAULT (unixepoch() * 1000) NOT NULL
);
--> statement-breakpoint
CREATE TABLE `image_models` (
	`air` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`architecture` text,
	`hero_image` text,
	`nsfw_level` integer,
	`last_used_at` integer DEFAULT (unixepoch() * 1000) NOT NULL,
	`created_at` integer DEFAULT (unixepoch() * 1000) NOT NULL
);
--> statement-breakpoint
CREATE INDEX `idx_image_models_last_used` ON `image_models` (`last_used_at`);--> statement-breakpoint
CREATE TABLE `image_presets` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`model` text NOT NULL,
	`prompt` text,
	`negative_prompt` text,
	`params` text,
	`loras` text,
	`extra_params` text,
	`created_at` integer DEFAULT (unixepoch() * 1000) NOT NULL,
	`updated_at` integer DEFAULT (unixepoch() * 1000) NOT NULL
);
--> statement-breakpoint
CREATE INDEX `idx_image_presets_name` ON `image_presets` (`name`);--> statement-breakpoint
CREATE TABLE `image_sessions` (
	`id` text PRIMARY KEY NOT NULL,
	`title` text,
	`first_model` text,
	`snapshot_count` integer DEFAULT 0 NOT NULL,
	`image_count` integer DEFAULT 0 NOT NULL,
	`expires_at` integer NOT NULL,
	`created_at` integer DEFAULT (unixepoch() * 1000) NOT NULL,
	`updated_at` integer DEFAULT (unixepoch() * 1000) NOT NULL
);
--> statement-breakpoint
CREATE INDEX `idx_image_session_updated` ON `image_sessions` (`updated_at`);--> statement-breakpoint
CREATE INDEX `idx_image_session_expires` ON `image_sessions` (`expires_at`);--> statement-breakpoint
CREATE TABLE `image_snapshots` (
	`id` text PRIMARY KEY NOT NULL,
	`session_id` text NOT NULL,
	`session_order` integer NOT NULL,
	`parent_snapshot_id` text,
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
	`error_message` text,
	`submitted_key` text,
	`created_at` integer DEFAULT (unixepoch() * 1000) NOT NULL,
	`updated_at` integer DEFAULT (unixepoch() * 1000) NOT NULL,
	`expires_at` integer NOT NULL,
	FOREIGN KEY (`session_id`) REFERENCES `image_sessions`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`parent_snapshot_id`) REFERENCES `image_snapshots`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
CREATE INDEX `idx_image_snapshot_session` ON `image_snapshots` (`session_id`,`session_order`);--> statement-breakpoint
CREATE INDEX `idx_image_snapshot_expires` ON `image_snapshots` (`expires_at`);--> statement-breakpoint
CREATE UNIQUE INDEX `idx_image_snapshot_submitted` ON `image_snapshots` (`submitted_key`);--> statement-breakpoint
CREATE TABLE `js_plugins` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`script` text NOT NULL,
	`kind` text DEFAULT 'risu' NOT NULL,
	`enabled` integer DEFAULT true NOT NULL,
	`created_at` integer DEFAULT (unixepoch() * 1000) NOT NULL,
	`updated_at` integer DEFAULT (unixepoch() * 1000) NOT NULL
);
--> statement-breakpoint
CREATE TABLE `local_migrations` (
	`name` text PRIMARY KEY NOT NULL,
	`tag` text NOT NULL,
	`applied_at` integer DEFAULT (unixepoch() * 1000) NOT NULL
);
--> statement-breakpoint
CREATE TABLE `local_pending_tasks` (
	`task_type` text DEFAULT 'logEnrich' NOT NULL,
	`kind` text NOT NULL,
	`id` text NOT NULL,
	`op` text NOT NULL,
	`queued_at` integer DEFAULT (unixepoch() * 1000) NOT NULL,
	`attempts` integer DEFAULT 0 NOT NULL,
	`next_attempt_at` integer,
	`last_error` text,
	`payload` text,
	`seq` integer DEFAULT 0 NOT NULL,
	PRIMARY KEY(`task_type`, `kind`, `id`)
);
--> statement-breakpoint
CREATE INDEX `idx_pending_queued` ON `local_pending_tasks` (`queued_at`);--> statement-breakpoint
CREATE TABLE `tokenizers` (
	`source` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`type` text NOT NULL,
	`tokenizer_json` text,
	`tokenizer_config` text,
	`fetched_at` integer DEFAULT (unixepoch() * 1000) NOT NULL
);
