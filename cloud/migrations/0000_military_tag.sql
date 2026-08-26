CREATE TABLE `admin_audit_log` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`admin_uid` text NOT NULL,
	`action` text NOT NULL,
	`target_uid` text,
	`detail` text,
	`created_at` integer DEFAULT (unixepoch()) NOT NULL
);
--> statement-breakpoint
CREATE TABLE `players` (
	`uid` text PRIMARY KEY NOT NULL,
	`email` text,
	`player_name` text DEFAULT '王都新秀' NOT NULL,
	`created_at` integer DEFAULT (unixepoch()) NOT NULL,
	`updated_at` integer DEFAULT (unixepoch()) NOT NULL
);
--> statement-breakpoint
CREATE TABLE `saves` (
	`uid` text PRIMARY KEY NOT NULL,
	`progress_json` text NOT NULL,
	`updated_at` integer DEFAULT (unixepoch()) NOT NULL,
	FOREIGN KEY (`uid`) REFERENCES `players`(`uid`) ON UPDATE no action ON DELETE no action
);
