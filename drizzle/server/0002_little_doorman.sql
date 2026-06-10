DROP INDEX `idx_acp_idem_lookup`;--> statement-breakpoint
DELETE FROM `acp_idempotency_keys` WHERE rowid NOT IN (SELECT MAX(rowid) FROM `acp_idempotency_keys` GROUP BY `user_id`, `key`, `path`);--> statement-breakpoint
CREATE UNIQUE INDEX `uq_acp_idem_key` ON `acp_idempotency_keys` (`user_id`,`key`,`path`);
