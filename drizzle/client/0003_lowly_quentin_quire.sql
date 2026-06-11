ALTER TABLE `request_logs` ADD `channel_name` text;--> statement-breakpoint
DROP TABLE `local_pending_sync`;--> statement-breakpoint
CREATE TABLE `local_pending_tasks` (
	`task_type` text DEFAULT 'sync' NOT NULL,
	`kind` text NOT NULL,
	`id` text NOT NULL,
	`op` text NOT NULL,
	`queued_at` integer DEFAULT (unixepoch() * 1000) NOT NULL,
	`attempts` integer DEFAULT 0 NOT NULL,
	`next_attempt_at` integer,
	`last_error` text,
	`payload` text,
	`seq` integer DEFAULT 0 NOT NULL,
	PRIMARY KEY(`task_type`, `kind`, `id`)
);--> statement-breakpoint
CREATE INDEX `idx_pending_queued` ON `local_pending_tasks` (`queued_at`);
