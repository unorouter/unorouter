ALTER TABLE `local_pending_sync` ADD `hint` text;--> statement-breakpoint
ALTER TABLE `local_pending_sync` ADD `msg_ids` text;--> statement-breakpoint
ALTER TABLE `local_pending_sync` ADD `seq` integer DEFAULT 0 NOT NULL;