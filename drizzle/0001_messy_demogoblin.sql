CREATE TABLE `contribution` (
	`id` text PRIMARY KEY NOT NULL,
	`projectId` text NOT NULL,
	`contributorId` text NOT NULL,
	`idempotencyKey` text NOT NULL,
	`amountMinor` text NOT NULL,
	`currency` text DEFAULT 'USD' NOT NULL,
	`source` text DEFAULT 'user_reported' NOT NULL,
	`status` text DEFAULT 'reported' NOT NULL,
	`note` text,
	`receivedAmountMinor` text,
	`refundedAmountMinor` text DEFAULT '0' NOT NULL,
	`externalReference` text,
	`verificationEvidence` text,
	`verifiedAt` integer,
	`createdAt` integer DEFAULT (unixepoch() * 1000) NOT NULL,
	`updatedAt` integer DEFAULT (unixepoch() * 1000) NOT NULL,
	FOREIGN KEY (`projectId`) REFERENCES `project`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`contributorId`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE restrict,
	CONSTRAINT "contribution_status_check" CHECK("contribution"."status" in ('reported', 'pending', 'confirmed', 'failed', 'expired', 'refunded')),
	CONSTRAINT "contribution_source_check" CHECK("contribution"."source" in ('user_reported', 'payment_adapter')),
	CONSTRAINT "contribution_reported_is_unverified_check" CHECK("contribution"."source" != 'user_reported' or "contribution"."status" = 'reported'),
	CONSTRAINT "contribution_confirmed_evidence_check" CHECK("contribution"."status" not in ('confirmed', 'refunded') or ("contribution"."source" = 'payment_adapter' and "contribution"."receivedAmountMinor" is not null and "contribution"."verificationEvidence" is not null and "contribution"."verifiedAt" is not null))
);
--> statement-breakpoint
CREATE UNIQUE INDEX `contribution_idempotency_idx` ON `contribution` (`projectId`,`contributorId`,`idempotencyKey`);--> statement-breakpoint
CREATE INDEX `contribution_project_created_idx` ON `contribution` (`projectId`,`createdAt`);