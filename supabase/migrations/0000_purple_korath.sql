CREATE TABLE "account" (
	"id" text PRIMARY KEY NOT NULL,
	"accountId" text NOT NULL,
	"providerId" text NOT NULL,
	"userId" text NOT NULL,
	"accessToken" text,
	"refreshToken" text,
	"idToken" text,
	"accessTokenExpiresAt" timestamp with time zone,
	"refreshTokenExpiresAt" timestamp with time zone,
	"scope" text,
	"password" text,
	"createdAt" timestamp with time zone NOT NULL,
	"updatedAt" timestamp with time zone NOT NULL
);
--> statement-breakpoint
CREATE TABLE "activityEvent" (
	"id" text PRIMARY KEY NOT NULL,
	"projectId" text NOT NULL,
	"actorId" text,
	"action" text NOT NULL,
	"entityType" text NOT NULL,
	"entityId" text NOT NULL,
	"details" text NOT NULL,
	"createdAt" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "contribution" (
	"id" text PRIMARY KEY NOT NULL,
	"projectId" text NOT NULL,
	"contributorId" text NOT NULL,
	"idempotencyKey" text NOT NULL,
	"amountMinor" text NOT NULL,
	"currency" text DEFAULT 'USD' NOT NULL,
	"source" text DEFAULT 'user_reported' NOT NULL,
	"status" text DEFAULT 'reported' NOT NULL,
	"note" text,
	"receivedAmountMinor" text,
	"refundedAmountMinor" text DEFAULT '0' NOT NULL,
	"externalReference" text,
	"verificationEvidence" text,
	"verifiedAt" timestamp with time zone,
	"refundEvidence" text,
	"refundedAt" timestamp with time zone,
	"createdAt" timestamp with time zone DEFAULT now() NOT NULL,
	"updatedAt" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "contribution_status_check" CHECK ("contribution"."status" in ('reported', 'pending', 'confirmed', 'failed', 'expired', 'refunded')),
	CONSTRAINT "contribution_source_check" CHECK ("contribution"."source" in ('user_reported', 'payment_adapter')),
	CONSTRAINT "contribution_reported_is_unverified_check" CHECK ("contribution"."source" != 'user_reported' or "contribution"."status" = 'reported'),
	CONSTRAINT "contribution_confirmed_evidence_check" CHECK ("contribution"."status" not in ('confirmed', 'refunded') or ("contribution"."source" = 'payment_adapter' and "contribution"."receivedAmountMinor" is not null and "contribution"."verificationEvidence" is not null and "contribution"."verifiedAt" is not null)),
	CONSTRAINT "contribution_refund_evidence_check" CHECK ("contribution"."refundedAmountMinor" = '0' or ("contribution"."refundEvidence" is not null and "contribution"."refundedAt" is not null)),
	CONSTRAINT "contribution_fully_refunded_check" CHECK ("contribution"."status" != 'refunded' or ("contribution"."receivedAmountMinor" = "contribution"."refundedAmountMinor" and "contribution"."refundEvidence" is not null and "contribution"."refundedAt" is not null))
);
--> statement-breakpoint
CREATE TABLE "invitation" (
	"id" text PRIMARY KEY NOT NULL,
	"projectId" text NOT NULL,
	"tokenHash" text NOT NULL,
	"role" text NOT NULL,
	"expiresAt" timestamp with time zone NOT NULL,
	"revokedAt" timestamp with time zone,
	"acceptedAt" timestamp with time zone,
	"acceptedBy" text,
	"createdBy" text NOT NULL,
	"createdAt" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "nearIntentPayment" (
	"id" text PRIMARY KEY NOT NULL,
	"projectId" text NOT NULL,
	"contributionId" text NOT NULL,
	"contributorId" text NOT NULL,
	"idempotencyKey" text NOT NULL,
	"correlationId" text NOT NULL,
	"depositAddress" text NOT NULL,
	"payerAccount" text NOT NULL,
	"recipientAccount" text NOT NULL,
	"originAssetId" text NOT NULL,
	"destinationAssetId" text NOT NULL,
	"originTokenContract" text NOT NULL,
	"destinationTokenContract" text NOT NULL,
	"amountIn" text NOT NULL,
	"maxAmountIn" text,
	"amountOut" text NOT NULL,
	"deadline" timestamp with time zone NOT NULL,
	"status" text DEFAULT 'PENDING_DEPOSIT' NOT NULL,
	"depositTransactionHash" text,
	"destinationTransactionHash" text,
	"statusEvidence" text,
	"createdAt" timestamp with time zone DEFAULT now() NOT NULL,
	"updatedAt" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "nearIntentPayment_contributionId_unique" UNIQUE("contributionId"),
	CONSTRAINT "nearIntentPayment_correlationId_unique" UNIQUE("correlationId"),
	CONSTRAINT "nearIntentPayment_depositAddress_unique" UNIQUE("depositAddress"),
	CONSTRAINT "near_intent_amounts_check" CHECK (cast("nearIntentPayment"."amountIn" as integer) > 0 and cast("nearIntentPayment"."amountOut" as integer) > 0),
	CONSTRAINT "near_intent_status_check" CHECK ("nearIntentPayment"."status" in ('PENDING_DEPOSIT', 'KNOWN_DEPOSIT_TX', 'PROCESSING', 'SUCCESS', 'FAILED', 'REFUNDED', 'INCOMPLETE_DEPOSIT', 'EXPIRED', 'VERIFICATION_FAILED'))
);
--> statement-breakpoint
CREATE TABLE "nearWalletChallenge" (
	"id" text PRIMARY KEY NOT NULL,
	"projectId" text NOT NULL,
	"userId" text NOT NULL,
	"accountId" text NOT NULL,
	"nonce" text NOT NULL,
	"expiresAt" timestamp with time zone NOT NULL,
	"consumedAt" timestamp with time zone,
	"createdAt" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "project" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"objective" text NOT NULL,
	"expectedOutcome" text,
	"targetAmountMinor" text NOT NULL,
	"currency" text DEFAULT 'USD' NOT NULL,
	"status" text DEFAULT 'active' NOT NULL,
	"nearTreasuryAccount" text,
	"nearTreasuryVerifiedAt" timestamp with time zone,
	"nearTreasuryVerifiedBy" text,
	"createdBy" text NOT NULL,
	"createdAt" timestamp with time zone DEFAULT now() NOT NULL,
	"updatedAt" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "projectMember" (
	"projectId" text NOT NULL,
	"userId" text NOT NULL,
	"role" text NOT NULL,
	"joinedAt" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "projectMember_projectId_userId_pk" PRIMARY KEY("projectId","userId")
);
--> statement-breakpoint
CREATE TABLE "projectSpendingPolicy" (
	"projectId" text PRIMARY KEY NOT NULL,
	"perTransactionCapMinor" text NOT NULL,
	"totalAuthorizedCapMinor" text NOT NULL,
	"allowedCategories" text NOT NULL,
	"allowedProviders" text NOT NULL,
	"agentExecutionAllowed" boolean DEFAULT false NOT NULL,
	"version" integer DEFAULT 1 NOT NULL,
	"expiresAt" timestamp with time zone NOT NULL,
	"updatedBy" text NOT NULL,
	"updatedAt" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "spending_policy_caps_check" CHECK (cast("projectSpendingPolicy"."perTransactionCapMinor" as integer) > 0 and cast("projectSpendingPolicy"."totalAuthorizedCapMinor" as integer) > 0),
	CONSTRAINT "spending_policy_version_check" CHECK ("projectSpendingPolicy"."version" > 0)
);
--> statement-breakpoint
CREATE TABLE "projectTask" (
	"id" text PRIMARY KEY NOT NULL,
	"projectId" text NOT NULL,
	"title" text NOT NULL,
	"description" text NOT NULL,
	"category" text,
	"estimatedCostMinor" text,
	"status" text DEFAULT 'todo' NOT NULL,
	"reportedOutcome" text,
	"createdBy" text NOT NULL,
	"updatedBy" text NOT NULL,
	"createdAt" timestamp with time zone DEFAULT now() NOT NULL,
	"updatedAt" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "project_task_status_check" CHECK ("projectTask"."status" in ('todo', 'in_progress', 'blocked', 'completed')),
	CONSTRAINT "project_task_completed_outcome_check" CHECK ("projectTask"."status" != 'completed' or length(trim(coalesce("projectTask"."reportedOutcome", ''))) >= 10)
);
--> statement-breakpoint
CREATE TABLE "purchaseApproval" (
	"id" text PRIMARY KEY NOT NULL,
	"projectId" text NOT NULL,
	"requestorId" text NOT NULL,
	"task" text NOT NULL,
	"purpose" text NOT NULL,
	"category" text NOT NULL,
	"providerId" text NOT NULL,
	"offerReference" text NOT NULL,
	"amountMinor" text NOT NULL,
	"currency" text DEFAULT 'USD' NOT NULL,
	"status" text DEFAULT 'pending' NOT NULL,
	"idempotencyKey" text NOT NULL,
	"policyVersion" integer NOT NULL,
	"expiresAt" timestamp with time zone NOT NULL,
	"approverId" text,
	"approvedAt" timestamp with time zone,
	"createdAt" timestamp with time zone DEFAULT now() NOT NULL,
	"updatedAt" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "purchase_approval_status_check" CHECK ("purchaseApproval"."status" in ('pending', 'approved', 'rejected', 'revoked', 'expired')),
	CONSTRAINT "purchase_approval_amount_check" CHECK (cast("purchaseApproval"."amountMinor" as integer) > 0)
);
--> statement-breakpoint
CREATE TABLE "session" (
	"id" text PRIMARY KEY NOT NULL,
	"expiresAt" timestamp with time zone NOT NULL,
	"token" text NOT NULL,
	"createdAt" timestamp with time zone NOT NULL,
	"updatedAt" timestamp with time zone NOT NULL,
	"ipAddress" text,
	"userAgent" text,
	"userId" text NOT NULL,
	CONSTRAINT "session_token_unique" UNIQUE("token")
);
--> statement-breakpoint
CREATE TABLE "user" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"email" text NOT NULL,
	"emailVerified" boolean DEFAULT false NOT NULL,
	"image" text,
	"createdAt" timestamp with time zone DEFAULT now() NOT NULL,
	"updatedAt" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "user_email_unique" UNIQUE("email")
);
--> statement-breakpoint
CREATE TABLE "verification" (
	"id" text PRIMARY KEY NOT NULL,
	"identifier" text NOT NULL,
	"value" text NOT NULL,
	"expiresAt" timestamp with time zone NOT NULL,
	"createdAt" timestamp with time zone,
	"updatedAt" timestamp with time zone
);
--> statement-breakpoint
ALTER TABLE "account" ADD CONSTRAINT "account_userId_user_id_fk" FOREIGN KEY ("userId") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "activityEvent" ADD CONSTRAINT "activityEvent_projectId_project_id_fk" FOREIGN KEY ("projectId") REFERENCES "public"."project"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "activityEvent" ADD CONSTRAINT "activityEvent_actorId_user_id_fk" FOREIGN KEY ("actorId") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "contribution" ADD CONSTRAINT "contribution_projectId_project_id_fk" FOREIGN KEY ("projectId") REFERENCES "public"."project"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "contribution" ADD CONSTRAINT "contribution_contributorId_user_id_fk" FOREIGN KEY ("contributorId") REFERENCES "public"."user"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "invitation" ADD CONSTRAINT "invitation_projectId_project_id_fk" FOREIGN KEY ("projectId") REFERENCES "public"."project"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "invitation" ADD CONSTRAINT "invitation_acceptedBy_user_id_fk" FOREIGN KEY ("acceptedBy") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "invitation" ADD CONSTRAINT "invitation_createdBy_user_id_fk" FOREIGN KEY ("createdBy") REFERENCES "public"."user"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "nearIntentPayment" ADD CONSTRAINT "nearIntentPayment_projectId_project_id_fk" FOREIGN KEY ("projectId") REFERENCES "public"."project"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "nearIntentPayment" ADD CONSTRAINT "nearIntentPayment_contributionId_contribution_id_fk" FOREIGN KEY ("contributionId") REFERENCES "public"."contribution"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "nearIntentPayment" ADD CONSTRAINT "nearIntentPayment_contributorId_user_id_fk" FOREIGN KEY ("contributorId") REFERENCES "public"."user"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "nearWalletChallenge" ADD CONSTRAINT "nearWalletChallenge_projectId_project_id_fk" FOREIGN KEY ("projectId") REFERENCES "public"."project"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "nearWalletChallenge" ADD CONSTRAINT "nearWalletChallenge_userId_user_id_fk" FOREIGN KEY ("userId") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "project" ADD CONSTRAINT "project_nearTreasuryVerifiedBy_user_id_fk" FOREIGN KEY ("nearTreasuryVerifiedBy") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "project" ADD CONSTRAINT "project_createdBy_user_id_fk" FOREIGN KEY ("createdBy") REFERENCES "public"."user"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "projectMember" ADD CONSTRAINT "projectMember_projectId_project_id_fk" FOREIGN KEY ("projectId") REFERENCES "public"."project"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "projectMember" ADD CONSTRAINT "projectMember_userId_user_id_fk" FOREIGN KEY ("userId") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "projectSpendingPolicy" ADD CONSTRAINT "projectSpendingPolicy_projectId_project_id_fk" FOREIGN KEY ("projectId") REFERENCES "public"."project"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "projectSpendingPolicy" ADD CONSTRAINT "projectSpendingPolicy_updatedBy_user_id_fk" FOREIGN KEY ("updatedBy") REFERENCES "public"."user"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "projectTask" ADD CONSTRAINT "projectTask_projectId_project_id_fk" FOREIGN KEY ("projectId") REFERENCES "public"."project"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "projectTask" ADD CONSTRAINT "projectTask_createdBy_user_id_fk" FOREIGN KEY ("createdBy") REFERENCES "public"."user"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "projectTask" ADD CONSTRAINT "projectTask_updatedBy_user_id_fk" FOREIGN KEY ("updatedBy") REFERENCES "public"."user"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "purchaseApproval" ADD CONSTRAINT "purchaseApproval_projectId_project_id_fk" FOREIGN KEY ("projectId") REFERENCES "public"."project"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "purchaseApproval" ADD CONSTRAINT "purchaseApproval_requestorId_user_id_fk" FOREIGN KEY ("requestorId") REFERENCES "public"."user"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "purchaseApproval" ADD CONSTRAINT "purchaseApproval_approverId_user_id_fk" FOREIGN KEY ("approverId") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "session" ADD CONSTRAINT "session_userId_user_id_fk" FOREIGN KEY ("userId") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "account_user_id_idx" ON "account" USING btree ("userId");--> statement-breakpoint
CREATE UNIQUE INDEX "account_provider_account_idx" ON "account" USING btree ("providerId","accountId");--> statement-breakpoint
CREATE INDEX "activity_project_created_idx" ON "activityEvent" USING btree ("projectId","createdAt");--> statement-breakpoint
CREATE UNIQUE INDEX "contribution_idempotency_idx" ON "contribution" USING btree ("projectId","contributorId","idempotencyKey");--> statement-breakpoint
CREATE INDEX "contribution_project_created_idx" ON "contribution" USING btree ("projectId","createdAt");--> statement-breakpoint
CREATE UNIQUE INDEX "invitation_token_hash_idx" ON "invitation" USING btree ("tokenHash");--> statement-breakpoint
CREATE INDEX "invitation_project_idx" ON "invitation" USING btree ("projectId");--> statement-breakpoint
CREATE UNIQUE INDEX "near_intent_idempotency_idx" ON "nearIntentPayment" USING btree ("projectId","contributorId","idempotencyKey");--> statement-breakpoint
CREATE INDEX "near_intent_project_status_idx" ON "nearIntentPayment" USING btree ("projectId","status","createdAt");--> statement-breakpoint
CREATE INDEX "near_wallet_challenge_project_user_idx" ON "nearWalletChallenge" USING btree ("projectId","userId","expiresAt");--> statement-breakpoint
CREATE INDEX "project_created_by_idx" ON "project" USING btree ("createdBy");--> statement-breakpoint
CREATE INDEX "project_status_idx" ON "project" USING btree ("status");--> statement-breakpoint
CREATE INDEX "project_member_user_idx" ON "projectMember" USING btree ("userId");--> statement-breakpoint
CREATE INDEX "project_task_project_created_idx" ON "projectTask" USING btree ("projectId","createdAt");--> statement-breakpoint
CREATE UNIQUE INDEX "purchase_approval_idempotency_idx" ON "purchaseApproval" USING btree ("projectId","requestorId","idempotencyKey");--> statement-breakpoint
CREATE INDEX "purchase_approval_project_status_idx" ON "purchaseApproval" USING btree ("projectId","status","createdAt");--> statement-breakpoint
CREATE INDEX "session_user_id_idx" ON "session" USING btree ("userId");--> statement-breakpoint
CREATE INDEX "verification_identifier_idx" ON "verification" USING btree ("identifier");
ALTER TABLE "account" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "activityEvent" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "contribution" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "invitation" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "nearIntentPayment" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "nearWalletChallenge" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "project" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "projectMember" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "projectSpendingPolicy" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "projectTask" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "purchaseApproval" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "session" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "user" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "verification" ENABLE ROW LEVEL SECURITY;