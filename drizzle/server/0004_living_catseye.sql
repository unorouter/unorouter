CREATE TABLE `model_catalog` (
	`name` text PRIMARY KEY NOT NULL,
	`payload` text NOT NULL,
	`is_free` integer DEFAULT false NOT NULL,
	`first_seen_at` integer NOT NULL,
	`last_seen_at` integer NOT NULL
);
--> statement-breakpoint
CREATE INDEX `idx_model_catalog_last_seen` ON `model_catalog` (`last_seen_at`);