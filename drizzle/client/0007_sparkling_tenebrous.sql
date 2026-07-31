CREATE TABLE `image_sessions` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` integer NOT NULL,
	`title` text,
	`first_model` text,
	`snapshot_count` integer DEFAULT 0 NOT NULL,
	`image_count` integer DEFAULT 0 NOT NULL,
	`expires_at` integer NOT NULL,
	`created_at` integer DEFAULT (unixepoch() * 1000) NOT NULL,
	`updated_at` integer DEFAULT (unixepoch() * 1000) NOT NULL
);
--> statement-breakpoint
CREATE INDEX `idx_image_session_user_updated` ON `image_sessions` (`user_id`,`updated_at`);--> statement-breakpoint
CREATE INDEX `idx_image_session_expires` ON `image_sessions` (`expires_at`);--> statement-breakpoint
CREATE TABLE `image_snapshots` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` integer NOT NULL,
	`session_id` text NOT NULL,
	`session_order` integer NOT NULL,
	`parent_snapshot_id` text,
	`requested_count` integer DEFAULT 1 NOT NULL,
	`task_id` text,
	`model` text NOT NULL,
	`prompt` text NOT NULL,
	`negative_prompt` text,
	`params` text,
	`loras` text,
	`references` text,
	`extra_params` text,
	`status` text DEFAULT 'pending' NOT NULL,
	`progress` text,
	`cost_quota` integer,
	`visibility` text DEFAULT 'private' NOT NULL,
	`flagged` integer DEFAULT false NOT NULL,
	`flag_reason` text,
	`error_message` text,
	`submitted_key` text,
	`created_at` integer DEFAULT (unixepoch() * 1000) NOT NULL,
	`updated_at` integer DEFAULT (unixepoch() * 1000) NOT NULL,
	`expires_at` integer NOT NULL,
	FOREIGN KEY (`session_id`) REFERENCES `image_sessions`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`parent_snapshot_id`) REFERENCES `image_snapshots`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
CREATE INDEX `idx_image_snapshot_session` ON `image_snapshots` (`session_id`,`session_order`);--> statement-breakpoint
CREATE INDEX `idx_image_snapshot_user` ON `image_snapshots` (`user_id`);--> statement-breakpoint
CREATE INDEX `idx_image_snapshot_expires` ON `image_snapshots` (`expires_at`);--> statement-breakpoint
CREATE UNIQUE INDEX `idx_image_snapshot_submitted` ON `image_snapshots` (`submitted_key`);