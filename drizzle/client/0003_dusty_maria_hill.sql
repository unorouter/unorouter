PRAGMA foreign_keys=OFF;--> statement-breakpoint
CREATE TABLE `__new_user_themes` (
	`user_id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`theme_json` text NOT NULL,
	`created_at` integer DEFAULT (unixepoch() * 1000) NOT NULL,
	`updated_at` integer DEFAULT (unixepoch() * 1000) NOT NULL
);
--> statement-breakpoint
INSERT INTO `__new_user_themes`("user_id", "theme_json", "created_at", "updated_at") SELECT "user_id", "theme_json", "created_at", "updated_at" FROM `user_themes`;--> statement-breakpoint
DROP TABLE `user_themes`;--> statement-breakpoint
ALTER TABLE `__new_user_themes` RENAME TO `user_themes`;--> statement-breakpoint
PRAGMA foreign_keys=ON;--> statement-breakpoint
CREATE INDEX `idx_user_themes_created` ON `user_themes` (`created_at`);