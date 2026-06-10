ALTER TABLE `characters` ADD `alternate_greetings` text;--> statement-breakpoint
ALTER TABLE `conversations` ADD `first_msg_index` integer DEFAULT -1 NOT NULL;