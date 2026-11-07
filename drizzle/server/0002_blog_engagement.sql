CREATE TABLE `blog_comment_votes` (
	`comment_id` text NOT NULL,
	`user_id` integer NOT NULL,
	`value` integer NOT NULL,
	`created_at` integer DEFAULT (unixepoch() * 1000) NOT NULL,
	`updated_at` integer DEFAULT (unixepoch() * 1000) NOT NULL,
	PRIMARY KEY(`comment_id`, `user_id`),
	FOREIGN KEY (`comment_id`) REFERENCES `blog_comments`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `blog_comments` (
	`id` text PRIMARY KEY NOT NULL,
	`post_slug` text NOT NULL,
	`parent_id` text,
	`user_id` integer NOT NULL,
	`author_name` text NOT NULL,
	`body` text NOT NULL,
	`hidden_at` integer,
	`hidden_by` integer,
	`created_at` integer DEFAULT (unixepoch() * 1000) NOT NULL,
	`updated_at` integer DEFAULT (unixepoch() * 1000) NOT NULL
);
--> statement-breakpoint
CREATE INDEX `idx_blog_comment_post` ON `blog_comments` (`post_slug`,`created_at`);--> statement-breakpoint
CREATE INDEX `idx_blog_comment_user` ON `blog_comments` (`user_id`,`created_at`);--> statement-breakpoint
CREATE TABLE `blog_post_reactions` (
	`post_slug` text NOT NULL,
	`user_id` integer NOT NULL,
	`kind` text NOT NULL,
	`created_at` integer DEFAULT (unixepoch() * 1000) NOT NULL,
	`updated_at` integer DEFAULT (unixepoch() * 1000) NOT NULL,
	PRIMARY KEY(`post_slug`, `user_id`, `kind`)
);
--> statement-breakpoint
CREATE TABLE `blog_post_views` (
	`post_slug` text NOT NULL,
	`visitor` text NOT NULL,
	`day` text NOT NULL,
	PRIMARY KEY(`post_slug`, `visitor`, `day`)
);
