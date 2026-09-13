CREATE TABLE `saved_themes` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`theme_json` text NOT NULL,
	`background_images` text DEFAULT '{}' NOT NULL,
	`created_at` integer DEFAULT (unixepoch() * 1000) NOT NULL,
	`updated_at` integer DEFAULT (unixepoch() * 1000) NOT NULL
);
--> statement-breakpoint
CREATE INDEX `idx_saved_themes_updated` ON `saved_themes` (`updated_at`);