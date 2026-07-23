DROP TABLE `playground_sessions`;--> statement-breakpoint
DROP TABLE `playgrounds`;--> statement-breakpoint
DROP TABLE `acp_checkout_sessions`;--> statement-breakpoint
DROP TABLE `acp_idempotency_keys`;--> statement-breakpoint
DROP TABLE `embedding_catalog`;--> statement-breakpoint
DROP TABLE `instance_leases`;--> statement-breakpoint
DROP TABLE `lora_catalog`;--> statement-breakpoint
DROP TABLE `model_catalog`;--> statement-breakpoint
DROP TABLE `upscaler_catalog`;--> statement-breakpoint
PRAGMA foreign_keys=OFF;--> statement-breakpoint
CREATE TABLE `__new_media` (
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
	`prompt_text` text,
	`created_at` integer DEFAULT (unixepoch() * 1000) NOT NULL,
	FOREIGN KEY (`conv_id`) REFERENCES `conversations`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
INSERT INTO `__new_media`("id", "user_id", "conv_id", "playground_id", "sequence_index", "upstream_result_url", "r2_key", "r2_url", "data_base64", "mime_type", "size_bytes", "width", "height", "extracted_text", "prompt_text", "created_at") SELECT "id", "user_id", "conv_id", "playground_id", "sequence_index", "upstream_result_url", "r2_key", "r2_url", "data_base64", "mime_type", "size_bytes", "width", "height", "extracted_text", "prompt_text", "created_at" FROM `media`;--> statement-breakpoint
DROP TABLE `media`;--> statement-breakpoint
ALTER TABLE `__new_media` RENAME TO `media`;--> statement-breakpoint
PRAGMA foreign_keys=ON;--> statement-breakpoint
CREATE INDEX `idx_media_user` ON `media` (`user_id`);--> statement-breakpoint
CREATE INDEX `idx_media_conv` ON `media` (`conv_id`);--> statement-breakpoint
ALTER TABLE `characters` ADD `assets` text;