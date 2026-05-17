DROP INDEX "idx_cardchar_card_order";--> statement-breakpoint
DROP INDEX "idx_cardlb_card_order";--> statement-breakpoint
DROP INDEX "idx_card_user_updated";--> statement-breakpoint
DROP INDEX "idx_card_sync_expires";--> statement-breakpoint
DROP INDEX "idx_char_user_updated";--> statement-breakpoint
DROP INDEX "idx_char_user_name";--> statement-breakpoint
DROP INDEX "idx_char_sync_expires";--> statement-breakpoint
DROP INDEX "idx_convchar_conv_order";--> statement-breakpoint
DROP INDEX "idx_convlb_conv_order";--> statement-breakpoint
DROP INDEX "conversations_share_id_unique";--> statement-breakpoint
DROP INDEX "idx_conv_user_updated";--> statement-breakpoint
DROP INDEX "idx_conv_share";--> statement-breakpoint
DROP INDEX "idx_conv_sync_expires";--> statement-breakpoint
DROP INDEX "idx_genimg_generation_id";--> statement-breakpoint
DROP INDEX "idx_likes_user";--> statement-breakpoint
DROP INDEX "generation_sessions_share_id_unique";--> statement-breakpoint
DROP INDEX "idx_session_user_updated";--> statement-breakpoint
DROP INDEX "idx_session_share";--> statement-breakpoint
DROP INDEX "idx_session_expires";--> statement-breakpoint
DROP INDEX "idx_session_sync_expires";--> statement-breakpoint
DROP INDEX "idx_gen_session_order";--> statement-breakpoint
DROP INDEX "idx_gen_visibility_created";--> statement-breakpoint
DROP INDEX "idx_gen_model_created";--> statement-breakpoint
DROP INDEX "idx_gen_task";--> statement-breakpoint
DROP INDEX "idx_gen_remixed_from";--> statement-breakpoint
DROP INDEX "idx_gen_expires";--> statement-breakpoint
DROP INDEX "idx_lbentry_book_enabled";--> statement-breakpoint
DROP INDEX "idx_lorebook_user";--> statement-breakpoint
DROP INDEX "idx_lorebook_sync_expires";--> statement-breakpoint
DROP INDEX "idx_media_user";--> statement-breakpoint
DROP INDEX "idx_media_conv";--> statement-breakpoint
DROP INDEX "idx_msgitem_msg_seq";--> statement-breakpoint
DROP INDEX "idx_msg_conv_parent";--> statement-breakpoint
DROP INDEX "idx_msg_conv_created";--> statement-breakpoint
DROP INDEX "idx_msg_parent_branch";--> statement-breakpoint
DROP INDEX "idx_persona_user_default";--> statement-breakpoint
DROP INDEX "idx_persona_user";--> statement-breakpoint
DROP INDEX "idx_persona_sync_expires";--> statement-breakpoint
DROP INDEX "idx_preset_user_name";--> statement-breakpoint
DROP INDEX "idx_preset_sync_expires";--> statement-breakpoint
DROP INDEX "idx_theme_sync_expires";--> statement-breakpoint
DROP INDEX "idx_acp_user_created";--> statement-breakpoint
DROP INDEX "idx_acp_idem_lookup";--> statement-breakpoint
DROP INDEX "idx_acp_idem_created";--> statement-breakpoint
DROP INDEX "idx_controlnet_basemodel_kind";--> statement-breakpoint
DROP INDEX "idx_embedding_basemodel_visible";--> statement-breakpoint
DROP INDEX "idx_embedding_category";--> statement-breakpoint
DROP INDEX "idx_lora_basemodel_visible";--> statement-breakpoint
DROP INDEX "idx_lora_category";--> statement-breakpoint
DROP INDEX "idx_modlog_user_created";--> statement-breakpoint
DROP INDEX "idx_modlog_decision";--> statement-breakpoint
DROP INDEX "idx_upscaler_category_visible";--> statement-breakpoint
ALTER TABLE `media` ALTER COLUMN "r2_key" TO "r2_key" text;--> statement-breakpoint
CREATE INDEX `idx_cardchar_card_order` ON `card_characters` (`card_id`,`order_index`);--> statement-breakpoint
CREATE INDEX `idx_cardlb_card_order` ON `card_lorebooks` (`card_id`,`order_index`);--> statement-breakpoint
CREATE INDEX `idx_card_user_updated` ON `cards` (`user_id`,`updated_at`);--> statement-breakpoint
CREATE INDEX `idx_card_sync_expires` ON `cards` (`sync_expires_at`);--> statement-breakpoint
CREATE INDEX `idx_char_user_updated` ON `characters` (`user_id`,`updated_at`);--> statement-breakpoint
CREATE INDEX `idx_char_user_name` ON `characters` (`user_id`,`name`);--> statement-breakpoint
CREATE INDEX `idx_char_sync_expires` ON `characters` (`sync_expires_at`);--> statement-breakpoint
CREATE INDEX `idx_convchar_conv_order` ON `conversation_characters` (`conv_id`,`order_index`);--> statement-breakpoint
CREATE INDEX `idx_convlb_conv_order` ON `conversation_lorebooks` (`conv_id`,`order_index`);--> statement-breakpoint
CREATE UNIQUE INDEX `conversations_share_id_unique` ON `conversations` (`share_id`);--> statement-breakpoint
CREATE INDEX `idx_conv_user_updated` ON `conversations` (`user_id`,`updated_at`);--> statement-breakpoint
CREATE INDEX `idx_conv_share` ON `conversations` (`share_id`);--> statement-breakpoint
CREATE INDEX `idx_conv_sync_expires` ON `conversations` (`sync_expires_at`);--> statement-breakpoint
CREATE INDEX `idx_genimg_generation_id` ON `generation_images` (`generation_id`);--> statement-breakpoint
CREATE INDEX `idx_likes_user` ON `generation_likes` (`user_id`);--> statement-breakpoint
CREATE UNIQUE INDEX `generation_sessions_share_id_unique` ON `generation_sessions` (`share_id`);--> statement-breakpoint
CREATE INDEX `idx_session_user_updated` ON `generation_sessions` (`user_id`,`updated_at`);--> statement-breakpoint
CREATE INDEX `idx_session_share` ON `generation_sessions` (`share_id`);--> statement-breakpoint
CREATE INDEX `idx_session_expires` ON `generation_sessions` (`expires_at`);--> statement-breakpoint
CREATE INDEX `idx_session_sync_expires` ON `generation_sessions` (`sync_expires_at`);--> statement-breakpoint
CREATE INDEX `idx_gen_session_order` ON `generations` (`session_id`,`session_order`);--> statement-breakpoint
CREATE INDEX `idx_gen_visibility_created` ON `generations` (`visibility`,`created_at`);--> statement-breakpoint
CREATE INDEX `idx_gen_model_created` ON `generations` (`model`,`created_at`);--> statement-breakpoint
CREATE INDEX `idx_gen_task` ON `generations` (`task_id`);--> statement-breakpoint
CREATE INDEX `idx_gen_remixed_from` ON `generations` (`remixed_from`);--> statement-breakpoint
CREATE INDEX `idx_gen_expires` ON `generations` (`expires_at`);--> statement-breakpoint
CREATE INDEX `idx_lbentry_book_enabled` ON `lorebook_entries` (`lorebook_id`,`enabled`);--> statement-breakpoint
CREATE INDEX `idx_lorebook_user` ON `lorebooks` (`user_id`);--> statement-breakpoint
CREATE INDEX `idx_lorebook_sync_expires` ON `lorebooks` (`sync_expires_at`);--> statement-breakpoint
CREATE INDEX `idx_media_user` ON `media` (`user_id`);--> statement-breakpoint
CREATE INDEX `idx_media_conv` ON `media` (`conv_id`);--> statement-breakpoint
CREATE INDEX `idx_msgitem_msg_seq` ON `message_items` (`message_id`,`sequence_index`);--> statement-breakpoint
CREATE INDEX `idx_msg_conv_parent` ON `messages` (`conv_id`,`parent_id`);--> statement-breakpoint
CREATE INDEX `idx_msg_conv_created` ON `messages` (`conv_id`,`created_at`);--> statement-breakpoint
CREATE INDEX `idx_msg_parent_branch` ON `messages` (`parent_id`,`branch_index`);--> statement-breakpoint
CREATE INDEX `idx_persona_user_default` ON `personas` (`user_id`,`is_default`);--> statement-breakpoint
CREATE INDEX `idx_persona_user` ON `personas` (`user_id`);--> statement-breakpoint
CREATE INDEX `idx_persona_sync_expires` ON `personas` (`sync_expires_at`);--> statement-breakpoint
CREATE INDEX `idx_preset_user_name` ON `sampling_presets` (`user_id`,`name`);--> statement-breakpoint
CREATE INDEX `idx_preset_sync_expires` ON `sampling_presets` (`sync_expires_at`);--> statement-breakpoint
CREATE INDEX `idx_theme_sync_expires` ON `user_themes` (`sync_expires_at`);--> statement-breakpoint
CREATE INDEX `idx_acp_user_created` ON `acp_checkout_sessions` (`user_id`,`created_at`);--> statement-breakpoint
CREATE INDEX `idx_acp_idem_lookup` ON `acp_idempotency_keys` (`user_id`,`key`,`path`);--> statement-breakpoint
CREATE INDEX `idx_acp_idem_created` ON `acp_idempotency_keys` (`created_at`);--> statement-breakpoint
CREATE INDEX `idx_controlnet_basemodel_kind` ON `controlnet_catalog` (`base_model`,`kind`);--> statement-breakpoint
CREATE INDEX `idx_embedding_basemodel_visible` ON `embedding_catalog` (`base_model`,`visible`);--> statement-breakpoint
CREATE INDEX `idx_embedding_category` ON `embedding_catalog` (`category`);--> statement-breakpoint
CREATE INDEX `idx_lora_basemodel_visible` ON `lora_catalog` (`base_model`,`visible`);--> statement-breakpoint
CREATE INDEX `idx_lora_category` ON `lora_catalog` (`category`);--> statement-breakpoint
CREATE INDEX `idx_modlog_user_created` ON `moderation_log` (`user_id`,`created_at`);--> statement-breakpoint
CREATE INDEX `idx_modlog_decision` ON `moderation_log` (`decision`,`created_at`);--> statement-breakpoint
CREATE INDEX `idx_upscaler_category_visible` ON `upscaler_catalog` (`category`,`visible`);--> statement-breakpoint
ALTER TABLE `media` ADD `r2_url` text;--> statement-breakpoint
ALTER TABLE `media` ADD `data_base64` text;--> statement-breakpoint
ALTER TABLE `personas` ADD `notes` text;