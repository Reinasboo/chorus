CREATE TABLE `nearIntentPayment` (
	`id` text PRIMARY KEY NOT NULL,
	`projectId` text NOT NULL,
	`contributionId` text NOT NULL,
	`contributorId` text NOT NULL,
	`idempotencyKey` text NOT NULL,
	`correlationId` text NOT NULL,
	`depositAddress` text NOT NULL,
	`payerAccount` text NOT NULL,
	`recipientAccount` text NOT NULL,
	`originAssetId` text NOT NULL,
	`destinationAssetId` text NOT NULL,
	`originTokenContract` text NOT NULL,
	`destinationTokenContract` text NOT NULL,
	`amountIn` text NOT NULL,
	`maxAmountIn` text,
	`amountOut` text NOT NULL,
	`deadline` integer NOT NULL,
	`status` text DEFAULT 'PENDING_DEPOSIT' NOT NULL,
	`depositTransactionHash` text,
	`destinationTransactionHash` text,
	`statusEvidence` text,
	`createdAt` integer DEFAULT (unixepoch() * 1000) NOT NULL,
	`updatedAt` integer DEFAULT (unixepoch() * 1000) NOT NULL,
	FOREIGN KEY (`projectId`) REFERENCES `project`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`contributionId`) REFERENCES `contribution`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`contributorId`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE restrict,
	CONSTRAINT "near_intent_amounts_check" CHECK(cast("nearIntentPayment"."amountIn" as integer) > 0 and cast("nearIntentPayment"."amountOut" as integer) > 0),
	CONSTRAINT "near_intent_status_check" CHECK("nearIntentPayment"."status" in ('PENDING_DEPOSIT', 'KNOWN_DEPOSIT_TX', 'PROCESSING', 'SUCCESS', 'FAILED', 'REFUNDED', 'INCOMPLETE_DEPOSIT', 'EXPIRED', 'VERIFICATION_FAILED'))
);
--> statement-breakpoint
CREATE UNIQUE INDEX `nearIntentPayment_contributionId_unique` ON `nearIntentPayment` (`contributionId`);--> statement-breakpoint
CREATE UNIQUE INDEX `nearIntentPayment_correlationId_unique` ON `nearIntentPayment` (`correlationId`);--> statement-breakpoint
CREATE UNIQUE INDEX `nearIntentPayment_depositAddress_unique` ON `nearIntentPayment` (`depositAddress`);--> statement-breakpoint
CREATE UNIQUE INDEX `near_intent_idempotency_idx` ON `nearIntentPayment` (`projectId`,`contributorId`,`idempotencyKey`);--> statement-breakpoint
CREATE INDEX `near_intent_project_status_idx` ON `nearIntentPayment` (`projectId`,`status`,`createdAt`);--> statement-breakpoint
CREATE TABLE `nearWalletChallenge` (
	`id` text PRIMARY KEY NOT NULL,
	`projectId` text NOT NULL,
	`userId` text NOT NULL,
	`accountId` text NOT NULL,
	`nonce` text NOT NULL,
	`expiresAt` integer NOT NULL,
	`consumedAt` integer,
	`createdAt` integer DEFAULT (unixepoch() * 1000) NOT NULL,
	FOREIGN KEY (`projectId`) REFERENCES `project`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`userId`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `near_wallet_challenge_project_user_idx` ON `nearWalletChallenge` (`projectId`,`userId`,`expiresAt`);--> statement-breakpoint
ALTER TABLE `project` ADD `nearTreasuryAccount` text;--> statement-breakpoint
ALTER TABLE `project` ADD `nearTreasuryVerifiedAt` integer;--> statement-breakpoint
ALTER TABLE `project` ADD `nearTreasuryVerifiedBy` text REFERENCES user(id);