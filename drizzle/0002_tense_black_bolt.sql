ALTER TABLE `contribution` ADD `refundEvidence` text;--> statement-breakpoint
ALTER TABLE `contribution` ADD `refundedAt` integer;--> statement-breakpoint
PRAGMA foreign_keys=OFF;--> statement-breakpoint
CREATE TABLE `__new_contribution` (
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
	`refundEvidence` text,
	`refundedAt` integer,
	`createdAt` integer DEFAULT (unixepoch() * 1000) NOT NULL,
	`updatedAt` integer DEFAULT (unixepoch() * 1000) NOT NULL,
	FOREIGN KEY (`projectId`) REFERENCES `project`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`contributorId`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE restrict,
	CONSTRAINT "contribution_status_check" CHECK("__new_contribution"."status" in ('reported', 'pending', 'confirmed', 'failed', 'expired', 'refunded')),
	CONSTRAINT "contribution_source_check" CHECK("__new_contribution"."source" in ('user_reported', 'payment_adapter')),
	CONSTRAINT "contribution_reported_is_unverified_check" CHECK("__new_contribution"."source" != 'user_reported' or "__new_contribution"."status" = 'reported'),
	CONSTRAINT "contribution_confirmed_evidence_check" CHECK("__new_contribution"."status" not in ('confirmed', 'refunded') or ("__new_contribution"."source" = 'payment_adapter' and "__new_contribution"."receivedAmountMinor" is not null and "__new_contribution"."verificationEvidence" is not null and "__new_contribution"."verifiedAt" is not null)),
	CONSTRAINT "contribution_refund_evidence_check" CHECK("__new_contribution"."refundedAmountMinor" = '0' or ("__new_contribution"."refundEvidence" is not null and "__new_contribution"."refundedAt" is not null)),
	CONSTRAINT "contribution_fully_refunded_check" CHECK("__new_contribution"."status" != 'refunded' or ("__new_contribution"."receivedAmountMinor" = "__new_contribution"."refundedAmountMinor" and "__new_contribution"."refundEvidence" is not null and "__new_contribution"."refundedAt" is not null))
);
--> statement-breakpoint
INSERT INTO `__new_contribution`("id", "projectId", "contributorId", "idempotencyKey", "amountMinor", "currency", "source", "status", "note", "receivedAmountMinor", "refundedAmountMinor", "externalReference", "verificationEvidence", "verifiedAt", "refundEvidence", "refundedAt", "createdAt", "updatedAt") SELECT "id", "projectId", "contributorId", "idempotencyKey", "amountMinor", "currency", "source", "status", "note", "receivedAmountMinor", "refundedAmountMinor", "externalReference", "verificationEvidence", "verifiedAt", "refundEvidence", "refundedAt", "createdAt", "updatedAt" FROM `contribution`;--> statement-breakpoint
DROP TABLE `contribution`;--> statement-breakpoint
ALTER TABLE `__new_contribution` RENAME TO `contribution`;--> statement-breakpoint
PRAGMA foreign_keys=ON;--> statement-breakpoint
CREATE UNIQUE INDEX `contribution_idempotency_idx` ON `contribution` (`projectId`,`contributorId`,`idempotencyKey`);--> statement-breakpoint
CREATE INDEX `contribution_project_created_idx` ON `contribution` (`projectId`,`createdAt`);