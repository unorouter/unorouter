PRAGMA foreign_keys=OFF;--> statement-breakpoint
CREATE TABLE `__new_request_logs` (
	`msg_id` text PRIMARY KEY NOT NULL,
	`conv_id` text NOT NULL,
	`request_body` text NOT NULL,
	`assembled_system` text,
	`final_messages` text NOT NULL,
	`response_headers` text,
	`dropped_params` text,
	`request_id` text,
	`input_tokens` integer,
	`output_tokens` integer,
	`cost` real,
	`duration_ms` integer,
	`tokens_per_second` real,
	`created_at` integer DEFAULT (unixepoch() * 1000) NOT NULL,
	FOREIGN KEY (`conv_id`) REFERENCES `conversations`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
INSERT INTO `__new_request_logs`("msg_id", "conv_id", "request_body", "assembled_system", "final_messages", "response_headers", "dropped_params", "request_id", "input_tokens", "output_tokens", "cost", "duration_ms", "tokens_per_second", "created_at") SELECT "msg_id", "conv_id", "request_body", "assembled_system", "final_messages", "response_headers", "dropped_params", "request_id", "input_tokens", "output_tokens", "cost", "duration_ms", "tokens_per_second", "created_at" FROM `request_logs`;--> statement-breakpoint
DROP TABLE `request_logs`;--> statement-breakpoint
ALTER TABLE `__new_request_logs` RENAME TO `request_logs`;--> statement-breakpoint
PRAGMA foreign_keys=ON;--> statement-breakpoint
CREATE INDEX `idx_reqlog_conv` ON `request_logs` (`conv_id`);--> statement-breakpoint
CREATE INDEX `idx_reqlog_created` ON `request_logs` (`created_at`);