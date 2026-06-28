CREATE TABLE `published_models` (
	`id` text PRIMARY KEY NOT NULL,
	`provider_id` text NOT NULL,
	`requested_model` text NOT NULL,
	`last_tested_at` integer NOT NULL,
	`created_at` integer DEFAULT (unixepoch() * 1000) NOT NULL,
	FOREIGN KEY (`provider_id`) REFERENCES `published_providers`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `uq_pubmodel` ON `published_models` (`provider_id`,`requested_model`);--> statement-breakpoint
CREATE TABLE `published_providers` (
	`id` text PRIMARY KEY NOT NULL,
	`kind` text NOT NULL,
	`base_url_host` text NOT NULL,
	`first_seen_at` integer NOT NULL,
	`last_tested_at` integer NOT NULL,
	`created_at` integer DEFAULT (unixepoch() * 1000) NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `uq_pubprovider` ON `published_providers` (`kind`,`base_url_host`);--> statement-breakpoint
CREATE TABLE `published_tests` (
	`id` text PRIMARY KEY NOT NULL,
	`model_id` text NOT NULL,
	`provider_id` text NOT NULL,
	`submitter_user_id` integer,
	`submitter_username` text,
	`kind` text NOT NULL,
	`base_url_host` text NOT NULL,
	`requested_model` text NOT NULL,
	`detected_model` text,
	`verdict` text NOT NULL,
	`version_unverifiable` integer DEFAULT false NOT NULL,
	`probes_passed` integer NOT NULL,
	`probes_total` integer NOT NULL,
	`latency_ms` integer NOT NULL,
	`total_tokens` integer,
	`tested_at` integer NOT NULL,
	`verified_at` integer,
	`created_at` integer DEFAULT (unixepoch() * 1000) NOT NULL,
	FOREIGN KEY (`model_id`) REFERENCES `published_models`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `idx_pubtest_host_model` ON `published_tests` (`base_url_host`,`requested_model`);--> statement-breakpoint
CREATE INDEX `idx_pubtest_created` ON `published_tests` (`created_at`);--> statement-breakpoint
CREATE INDEX `idx_pubtest_submitter` ON `published_tests` (`submitter_user_id`,`base_url_host`,`requested_model`);--> statement-breakpoint
ALTER TABLE `conversations` ADD `utility_model` text;--> statement-breakpoint
ALTER TABLE `conversations` ADD `image_enabled` integer;--> statement-breakpoint
ALTER TABLE `conversations` ADD `prompt_instruction` text;--> statement-breakpoint
ALTER TABLE `messages` ADD `branch_vars` text;