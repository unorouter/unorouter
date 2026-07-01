ALTER TABLE `conversations` ADD `image_model` text;--> statement-breakpoint
ALTER TABLE `conversations` ADD `image_preview` integer;--> statement-breakpoint
ALTER TABLE `conversations` ADD `image_ref_ids` text;--> statement-breakpoint
ALTER TABLE `conversations` ADD `use_char_avatar_ref` integer;--> statement-breakpoint
ALTER TABLE `media` ADD `prompt_text` text;--> statement-breakpoint
ALTER TABLE `sampling_presets` ADD `image_model` text;--> statement-breakpoint
ALTER TABLE `sampling_presets` ADD `image_preview` integer;--> statement-breakpoint
ALTER TABLE `sampling_presets` ADD `use_char_avatar_ref` integer;