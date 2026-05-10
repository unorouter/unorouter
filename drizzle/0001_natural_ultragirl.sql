CREATE TABLE `controlnet_catalog` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`filename` text NOT NULL,
	`base_model` text NOT NULL,
	`kind` text NOT NULL,
	`description` text,
	`visible` integer DEFAULT true NOT NULL,
	`sort_order` integer DEFAULT 0 NOT NULL,
	`created_at` integer DEFAULT (unixepoch() * 1000) NOT NULL,
	`updated_at` integer DEFAULT (unixepoch() * 1000) NOT NULL
);
--> statement-breakpoint
CREATE INDEX `idx_controlnet_basemodel_kind` ON `controlnet_catalog` (`base_model`,`kind`);--> statement-breakpoint
CREATE TABLE `embedding_catalog` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`source` text NOT NULL,
	`source_id` text NOT NULL,
	`filename` text NOT NULL,
	`base_model` text NOT NULL,
	`category` text NOT NULL,
	`description` text,
	`thumbnail_r2_key` text,
	`nsfw` integer DEFAULT false NOT NULL,
	`visible` integer DEFAULT true NOT NULL,
	`sort_order` integer DEFAULT 0 NOT NULL,
	`created_at` integer DEFAULT (unixepoch() * 1000) NOT NULL,
	`updated_at` integer DEFAULT (unixepoch() * 1000) NOT NULL
);
--> statement-breakpoint
CREATE INDEX `idx_embedding_basemodel_visible` ON `embedding_catalog` (`base_model`,`visible`);--> statement-breakpoint
CREATE INDEX `idx_embedding_category` ON `embedding_catalog` (`category`);--> statement-breakpoint
CREATE TABLE `upscaler_catalog` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`filename` text NOT NULL,
	`category` text NOT NULL,
	`native_scale` integer DEFAULT 4 NOT NULL,
	`description` text,
	`visible` integer DEFAULT true NOT NULL,
	`sort_order` integer DEFAULT 0 NOT NULL,
	`created_at` integer DEFAULT (unixepoch() * 1000) NOT NULL,
	`updated_at` integer DEFAULT (unixepoch() * 1000) NOT NULL
);
--> statement-breakpoint
CREATE INDEX `idx_upscaler_category_visible` ON `upscaler_catalog` (`category`,`visible`);