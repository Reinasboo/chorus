CREATE TABLE `projectTask` (
	`id` text PRIMARY KEY NOT NULL,
	`projectId` text NOT NULL,
	`title` text NOT NULL,
	`description` text NOT NULL,
	`status` text DEFAULT 'todo' NOT NULL,
	`reportedOutcome` text,
	`createdBy` text NOT NULL,
	`updatedBy` text NOT NULL,
	`createdAt` integer DEFAULT (unixepoch() * 1000) NOT NULL,
	`updatedAt` integer DEFAULT (unixepoch() * 1000) NOT NULL,
	FOREIGN KEY (`projectId`) REFERENCES `project`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`createdBy`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE restrict,
	FOREIGN KEY (`updatedBy`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE restrict,
	CONSTRAINT "project_task_status_check" CHECK("projectTask"."status" in ('todo', 'in_progress', 'blocked', 'completed')),
	CONSTRAINT "project_task_completed_outcome_check" CHECK("projectTask"."status" != 'completed' or length(trim(coalesce("projectTask"."reportedOutcome", ''))) >= 10)
);
--> statement-breakpoint
CREATE INDEX `project_task_project_created_idx` ON `projectTask` (`projectId`,`createdAt`);