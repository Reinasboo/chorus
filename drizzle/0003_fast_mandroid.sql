CREATE TABLE `projectSpendingPolicy` (
	`projectId` text PRIMARY KEY NOT NULL,
	`perTransactionCapMinor` text NOT NULL,
	`totalAuthorizedCapMinor` text NOT NULL,
	`allowedCategories` text NOT NULL,
	`allowedProviders` text NOT NULL,
	`agentExecutionAllowed` integer DEFAULT false NOT NULL,
	`version` integer DEFAULT 1 NOT NULL,
	`expiresAt` integer NOT NULL,
	`updatedBy` text NOT NULL,
	`updatedAt` integer DEFAULT (unixepoch() * 1000) NOT NULL,
	FOREIGN KEY (`projectId`) REFERENCES `project`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`updatedBy`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE restrict,
	CONSTRAINT "spending_policy_caps_check" CHECK(cast("projectSpendingPolicy"."perTransactionCapMinor" as integer) > 0 and cast("projectSpendingPolicy"."totalAuthorizedCapMinor" as integer) > 0),
	CONSTRAINT "spending_policy_version_check" CHECK("projectSpendingPolicy"."version" > 0)
);
--> statement-breakpoint
CREATE TABLE `purchaseApproval` (
	`id` text PRIMARY KEY NOT NULL,
	`projectId` text NOT NULL,
	`requestorId` text NOT NULL,
	`task` text NOT NULL,
	`purpose` text NOT NULL,
	`category` text NOT NULL,
	`providerId` text NOT NULL,
	`offerReference` text NOT NULL,
	`amountMinor` text NOT NULL,
	`currency` text DEFAULT 'USD' NOT NULL,
	`status` text DEFAULT 'pending' NOT NULL,
	`idempotencyKey` text NOT NULL,
	`policyVersion` integer NOT NULL,
	`expiresAt` integer NOT NULL,
	`approverId` text,
	`approvedAt` integer,
	`createdAt` integer DEFAULT (unixepoch() * 1000) NOT NULL,
	`updatedAt` integer DEFAULT (unixepoch() * 1000) NOT NULL,
	FOREIGN KEY (`projectId`) REFERENCES `project`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`requestorId`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE restrict,
	FOREIGN KEY (`approverId`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE set null,
	CONSTRAINT "purchase_approval_status_check" CHECK("purchaseApproval"."status" in ('pending', 'approved', 'rejected', 'revoked', 'expired')),
	CONSTRAINT "purchase_approval_amount_check" CHECK(cast("purchaseApproval"."amountMinor" as integer) > 0)
);
--> statement-breakpoint
CREATE UNIQUE INDEX `purchase_approval_idempotency_idx` ON `purchaseApproval` (`projectId`,`requestorId`,`idempotencyKey`);--> statement-breakpoint
CREATE INDEX `purchase_approval_project_status_idx` ON `purchaseApproval` (`projectId`,`status`,`createdAt`);