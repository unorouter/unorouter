PRAGMA foreign_keys=OFF;--> statement-breakpoint
CREATE TABLE `__new_media` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` integer NOT NULL,
	`conv_id` text,
	`r2_key` text,
	`r2_url` text,
	`data_base64` text,
	`mime_type` text NOT NULL,
	`size_bytes` integer NOT NULL,
	`extracted_text` text,
	`created_at` integer DEFAULT (unixepoch() * 1000) NOT NULL,
	FOREIGN KEY (`conv_id`) REFERENCES `conversations`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
INSERT INTO `__new_media`("id", "user_id", "conv_id", "r2_key", "mime_type", "size_bytes", "extracted_text", "created_at") SELECT "id", "user_id", "conv_id", "r2_key", "mime_type", "size_bytes", "extracted_text", "created_at" FROM `media`;--> statement-breakpoint
DROP TABLE `media`;--> statement-breakpoint
ALTER TABLE `__new_media` RENAME TO `media`;--> statement-breakpoint
PRAGMA foreign_keys=ON;--> statement-breakpoint
CREATE INDEX `idx_media_user` ON `media` (`user_id`);--> statement-breakpoint
CREATE INDEX `idx_media_conv` ON `media` (`conv_id`);
