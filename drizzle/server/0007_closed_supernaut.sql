DROP INDEX `idx_card_sync_expires`;--> statement-breakpoint
ALTER TABLE `cards` DROP COLUMN `sync_expires_at`;--> statement-breakpoint
DROP INDEX `idx_char_sync_expires`;--> statement-breakpoint
ALTER TABLE `characters` DROP COLUMN `sync_expires_at`;--> statement-breakpoint
DROP INDEX `idx_conv_sync_expires`;--> statement-breakpoint
ALTER TABLE `conversations` DROP COLUMN `sync_expires_at`;--> statement-breakpoint
DROP INDEX `idx_lorebook_sync_expires`;--> statement-breakpoint
ALTER TABLE `lorebooks` DROP COLUMN `sync_expires_at`;--> statement-breakpoint
DROP INDEX `idx_persona_sync_expires`;--> statement-breakpoint
ALTER TABLE `personas` DROP COLUMN `sync_expires_at`;--> statement-breakpoint
DROP INDEX `idx_session_sync_expires`;--> statement-breakpoint
ALTER TABLE `playground_sessions` DROP COLUMN `sync_expires_at`;--> statement-breakpoint
DROP INDEX `idx_preset_sync_expires`;--> statement-breakpoint
ALTER TABLE `sampling_presets` DROP COLUMN `sync_expires_at`;--> statement-breakpoint
DROP INDEX `idx_tester_model_sync_expires`;--> statement-breakpoint
ALTER TABLE `tester_models` DROP COLUMN `sync_expires_at`;--> statement-breakpoint
DROP INDEX `idx_tester_provider_sync_expires`;--> statement-breakpoint
ALTER TABLE `tester_providers` DROP COLUMN `sync_expires_at`;--> statement-breakpoint
DROP INDEX `idx_tester_test_sync_expires`;--> statement-breakpoint
ALTER TABLE `tester_tests` DROP COLUMN `sync_expires_at`;--> statement-breakpoint
DROP INDEX `idx_theme_sync_expires`;--> statement-breakpoint
ALTER TABLE `user_themes` DROP COLUMN `sync_expires_at`;--> statement-breakpoint
ALTER TABLE `chat_groups` DROP COLUMN `sync_expires_at`;