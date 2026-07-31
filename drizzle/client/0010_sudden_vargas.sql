CREATE TABLE `image_presets` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` integer NOT NULL,
	`name` text NOT NULL,
	`model` text NOT NULL,
	`negative_prompt` text,
	`params` text,
	`loras` text,
	`extra_params` text,
	`created_at` integer DEFAULT (unixepoch() * 1000) NOT NULL,
	`updated_at` integer DEFAULT (unixepoch() * 1000) NOT NULL
);
--> statement-breakpoint
CREATE INDEX `idx_image_presets_user` ON `image_presets` (`user_id`,`name`);