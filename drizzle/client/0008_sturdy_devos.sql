CREATE TABLE `image_models` (
	`air` text PRIMARY KEY NOT NULL,
	`user_id` integer NOT NULL,
	`name` text NOT NULL,
	`architecture` text,
	`hero_image` text,
	`nsfw_level` integer,
	`last_used_at` integer DEFAULT (unixepoch() * 1000) NOT NULL,
	`created_at` integer DEFAULT (unixepoch() * 1000) NOT NULL
);
--> statement-breakpoint
CREATE INDEX `idx_image_models_user` ON `image_models` (`user_id`,`last_used_at`);