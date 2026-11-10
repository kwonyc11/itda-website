CREATE TABLE `editor_invitations` (
	`email` text PRIMARY KEY NOT NULL,
	`invited_by` text NOT NULL,
	`created_at` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `editors` (
	`user_id` text PRIMARY KEY NOT NULL,
	`email` text NOT NULL,
	`name` text NOT NULL,
	`active` integer DEFAULT 1 NOT NULL,
	`joined_at` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `site_owner` (
	`key` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `archive_posts` (
	`id` text PRIMARY KEY NOT NULL,
	`round` integer NOT NULL,
	`kind` text NOT NULL,
	`draft_json` text NOT NULL,
	`live_json` text,
	`version` integer DEFAULT 1 NOT NULL,
	`updated_by` text NOT NULL,
	`updated_at` text NOT NULL,
	`published_at` text
);
--> statement-breakpoint
CREATE TABLE `archive_revisions` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`post_id` text NOT NULL,
	`version` integer NOT NULL,
	`content_json` text NOT NULL,
	`action` text NOT NULL,
	`actor_id` text NOT NULL,
	`created_at` text NOT NULL
);
