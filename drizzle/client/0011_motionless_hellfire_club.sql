ALTER TABLE `request_logs` ADD `cached_input_tokens` integer;--> statement-breakpoint
ALTER TABLE `sampling_presets` ADD `disable_caching` integer DEFAULT false NOT NULL;