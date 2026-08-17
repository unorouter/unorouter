DROP INDEX `idx_card_user_updated`;--> statement-breakpoint
CREATE INDEX `idx_card_updated` ON `cards` (`updated_at`);--> statement-breakpoint
ALTER TABLE `cards` DROP COLUMN `user_id`;--> statement-breakpoint
DROP INDEX `idx_char_user_updated`;--> statement-breakpoint
DROP INDEX `idx_char_user_name`;--> statement-breakpoint
CREATE INDEX `idx_char_updated` ON `characters` (`updated_at`);--> statement-breakpoint
CREATE INDEX `idx_char_name` ON `characters` (`name`);--> statement-breakpoint
ALTER TABLE `characters` DROP COLUMN `user_id`;--> statement-breakpoint
DROP INDEX `idx_chat_group_user_order`;--> statement-breakpoint
CREATE INDEX `idx_chat_group_order` ON `chat_groups` (`order_index`);--> statement-breakpoint
ALTER TABLE `chat_groups` DROP COLUMN `user_id`;--> statement-breakpoint
DROP INDEX `idx_conv_user_updated`;--> statement-breakpoint
DROP INDEX `idx_conv_user_group`;--> statement-breakpoint
CREATE INDEX `idx_conv_updated` ON `conversations` (`updated_at`);--> statement-breakpoint
CREATE INDEX `idx_conv_group` ON `conversations` (`group_id`);--> statement-breakpoint
ALTER TABLE `conversations` DROP COLUMN `user_id`;--> statement-breakpoint
DROP INDEX `idx_lorebook_user`;--> statement-breakpoint
ALTER TABLE `lorebooks` DROP COLUMN `user_id`;--> statement-breakpoint
DROP INDEX `idx_media_user`;--> statement-breakpoint
ALTER TABLE `media` DROP COLUMN `user_id`;--> statement-breakpoint
DROP INDEX `idx_persona_user_default`;--> statement-breakpoint
DROP INDEX `idx_persona_user`;--> statement-breakpoint
CREATE INDEX `idx_persona_default` ON `personas` (`is_default`);--> statement-breakpoint
ALTER TABLE `personas` DROP COLUMN `user_id`;--> statement-breakpoint
DROP INDEX `idx_preset_user_name`;--> statement-breakpoint
CREATE INDEX `idx_preset_name` ON `sampling_presets` (`name`);--> statement-breakpoint
ALTER TABLE `sampling_presets` DROP COLUMN `user_id`;--> statement-breakpoint
DROP INDEX `idx_custom_providers_user`;--> statement-breakpoint
ALTER TABLE `custom_providers` DROP COLUMN `user_id`;--> statement-breakpoint
DROP INDEX `idx_image_models_user`;--> statement-breakpoint
CREATE INDEX `idx_image_models_last_used` ON `image_models` (`last_used_at`);--> statement-breakpoint
ALTER TABLE `image_models` DROP COLUMN `user_id`;--> statement-breakpoint
DROP INDEX `idx_image_presets_user`;--> statement-breakpoint
CREATE INDEX `idx_image_presets_name` ON `image_presets` (`name`);--> statement-breakpoint
ALTER TABLE `image_presets` DROP COLUMN `user_id`;--> statement-breakpoint
DROP INDEX `idx_image_session_user_updated`;--> statement-breakpoint
CREATE INDEX `idx_image_session_updated` ON `image_sessions` (`updated_at`);--> statement-breakpoint
ALTER TABLE `image_sessions` DROP COLUMN `user_id`;--> statement-breakpoint
DROP INDEX `idx_image_snapshot_user`;--> statement-breakpoint
ALTER TABLE `image_snapshots` DROP COLUMN `user_id`;--> statement-breakpoint
DROP INDEX `idx_js_plugins_user`;--> statement-breakpoint
ALTER TABLE `js_plugins` DROP COLUMN `user_id`;--> statement-breakpoint
PRAGMA foreign_keys=OFF;--> statement-breakpoint
CREATE TABLE `__new_user_themes` (
	`user_id` integer PRIMARY KEY DEFAULT 1 NOT NULL,
	`theme_json` text NOT NULL,
	`created_at` integer DEFAULT (unixepoch() * 1000) NOT NULL,
	`updated_at` integer DEFAULT (unixepoch() * 1000) NOT NULL
);
--> statement-breakpoint
INSERT INTO `__new_user_themes`("user_id", "theme_json", "created_at", "updated_at") SELECT "user_id", "theme_json", "created_at", "updated_at" FROM `user_themes`;--> statement-breakpoint
DROP TABLE `user_themes`;--> statement-breakpoint
ALTER TABLE `__new_user_themes` RENAME TO `user_themes`;--> statement-breakpoint
PRAGMA foreign_keys=ON;