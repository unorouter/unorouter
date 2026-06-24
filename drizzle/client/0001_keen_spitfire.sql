CREATE TABLE `tokenizers` (
	`source` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`type` text NOT NULL,
	`tokenizer_json` text,
	`tokenizer_config` text,
	`fetched_at` integer DEFAULT (unixepoch() * 1000) NOT NULL
);
--> statement-breakpoint
ALTER TABLE `custom_providers` DROP COLUMN `tokenizer`;