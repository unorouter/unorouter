CREATE TABLE `tester_models` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` integer NOT NULL,
	`provider_id` text NOT NULL,
	`requested_model` text NOT NULL,
	`last_detected_model` text,
	`last_verdict` text,
	`last_tested_at` integer NOT NULL,
	`created_at` integer DEFAULT (unixepoch() * 1000) NOT NULL,
	`updated_at` integer DEFAULT (unixepoch() * 1000) NOT NULL,
	FOREIGN KEY (`provider_id`) REFERENCES `tester_providers`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `uq_tester_model` ON `tester_models` (`provider_id`,`requested_model`);--> statement-breakpoint
CREATE TABLE `tester_probes` (
	`id` text PRIMARY KEY NOT NULL,
	`test_id` text NOT NULL,
	`order_index` integer DEFAULT 0 NOT NULL,
	`label` text NOT NULL,
	`prompt` text NOT NULL,
	`response_text` text,
	`http_status` integer,
	`pass` integer DEFAULT false NOT NULL,
	`transient` integer DEFAULT false NOT NULL,
	`signal` text,
	`reason` text,
	`prompt_tokens` integer,
	`completion_tokens` integer,
	`latency_ms` integer DEFAULT 0 NOT NULL,
	FOREIGN KEY (`test_id`) REFERENCES `tester_tests`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `idx_tester_probe_test` ON `tester_probes` (`test_id`,`order_index`);--> statement-breakpoint
CREATE TABLE `tester_providers` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` integer NOT NULL,
	`kind` text NOT NULL,
	`base_url_host` text NOT NULL,
	`label` text,
	`first_seen_at` integer NOT NULL,
	`last_tested_at` integer NOT NULL,
	`created_at` integer DEFAULT (unixepoch() * 1000) NOT NULL,
	`updated_at` integer DEFAULT (unixepoch() * 1000) NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `uq_tester_provider` ON `tester_providers` (`user_id`,`kind`,`base_url_host`);--> statement-breakpoint
CREATE TABLE `tester_tests` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` integer NOT NULL,
	`model_id` text NOT NULL,
	`provider_id` text NOT NULL,
	`verdict` text NOT NULL,
	`version_unverifiable` integer DEFAULT false NOT NULL,
	`detected_model` text,
	`probes_passed` integer DEFAULT 0 NOT NULL,
	`probes_total` integer DEFAULT 0 NOT NULL,
	`prompt_tokens` integer,
	`completion_tokens` integer,
	`total_tokens` integer,
	`latency_ms` integer DEFAULT 0 NOT NULL,
	`transport` text DEFAULT 'direct' NOT NULL,
	`resolved_format` text,
	`format_fell_back` integer DEFAULT false NOT NULL,
	`tested_at` integer NOT NULL,
	`published_at` integer,
	`submitter_user_id` integer,
	`submitter_username` text,
	`verified_at` integer,
	`kind` text,
	`base_url_host` text,
	`requested_model` text,
	`created_at` integer DEFAULT (unixepoch() * 1000) NOT NULL,
	`updated_at` integer DEFAULT (unixepoch() * 1000) NOT NULL,
	FOREIGN KEY (`model_id`) REFERENCES `tester_models`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `idx_tester_test_user_tested` ON `tester_tests` (`user_id`,`tested_at`);--> statement-breakpoint
CREATE INDEX `idx_tester_test_model` ON `tester_tests` (`model_id`);--> statement-breakpoint
CREATE INDEX `idx_tester_test_published` ON `tester_tests` (`published_at`);--> statement-breakpoint
CREATE INDEX `idx_tester_test_verified` ON `tester_tests` (`verified_at`);--> statement-breakpoint
CREATE INDEX `idx_tester_test_host_model` ON `tester_tests` (`base_url_host`,`requested_model`);--> statement-breakpoint
CREATE INDEX `idx_tester_test_submitter` ON `tester_tests` (`submitter_user_id`,`base_url_host`,`requested_model`);