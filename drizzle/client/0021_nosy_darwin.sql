PRAGMA foreign_keys=OFF;--> statement-breakpoint
CREATE TABLE `__new_js_plugins` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`script` text NOT NULL,
	`kind` text DEFAULT 'risu' NOT NULL,
	`enabled` integer DEFAULT true NOT NULL,
	`created_at` integer DEFAULT (unixepoch() * 1000) NOT NULL,
	`updated_at` integer DEFAULT (unixepoch() * 1000) NOT NULL
);
--> statement-breakpoint
INSERT INTO `__new_js_plugins`("id", "name", "script", "kind", "enabled", "created_at", "updated_at") SELECT "id", "name", "script", "kind", "enabled", "created_at", "updated_at" FROM `js_plugins`;--> statement-breakpoint
DROP TABLE `js_plugins`;--> statement-breakpoint
ALTER TABLE `__new_js_plugins` RENAME TO `js_plugins`;--> statement-breakpoint
PRAGMA foreign_keys=ON;--> statement-breakpoint
ALTER TABLE `request_logs` ADD `sent` text;--> statement-breakpoint
ALTER TABLE `sampling_presets` ADD `reasoning_effort` text;
