import { relations, sql } from "drizzle-orm";
import {
  check,
  index,
  boolean,
  integer,
  primaryKey,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
} from "drizzle-orm/pg-core";

export const user = pgTable("user", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  email: text("email").notNull().unique(),
  emailVerified: boolean("emailVerified").notNull().default(false),
  image: text("image"),
  createdAt: timestamp("createdAt", { withTimezone: true, mode: "date" })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp("updatedAt", { withTimezone: true, mode: "date" })
    .notNull()
    .defaultNow(),
});

export const session = pgTable(
  "session",
  {
    id: text("id").primaryKey(),
    expiresAt: timestamp("expiresAt", { withTimezone: true, mode: "date" }).notNull(),
    token: text("token").notNull().unique(),
    createdAt: timestamp("createdAt", { withTimezone: true, mode: "date" }).notNull(),
    updatedAt: timestamp("updatedAt", { withTimezone: true, mode: "date" }).notNull(),
    ipAddress: text("ipAddress"),
    userAgent: text("userAgent"),
    userId: text("userId")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
  },
  (table) => [index("session_user_id_idx").on(table.userId)],
);

export const account = pgTable(
  "account",
  {
    id: text("id").primaryKey(),
    accountId: text("accountId").notNull(),
    providerId: text("providerId").notNull(),
    userId: text("userId")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    accessToken: text("accessToken"),
    refreshToken: text("refreshToken"),
    idToken: text("idToken"),
    accessTokenExpiresAt: timestamp("accessTokenExpiresAt", {
      withTimezone: true,
      mode: "date",
    }),
    refreshTokenExpiresAt: timestamp("refreshTokenExpiresAt", {
      withTimezone: true,
      mode: "date",
    }),
    scope: text("scope"),
    password: text("password"),
    createdAt: timestamp("createdAt", { withTimezone: true, mode: "date" }).notNull(),
    updatedAt: timestamp("updatedAt", { withTimezone: true, mode: "date" }).notNull(),
  },
  (table) => [
    index("account_user_id_idx").on(table.userId),
    uniqueIndex("account_provider_account_idx").on(
      table.providerId,
      table.accountId,
    ),
  ],
);

export const verification = pgTable(
  "verification",
  {
    id: text("id").primaryKey(),
    identifier: text("identifier").notNull(),
    value: text("value").notNull(),
    expiresAt: timestamp("expiresAt", { withTimezone: true, mode: "date" }).notNull(),
    createdAt: timestamp("createdAt", { withTimezone: true, mode: "date" }),
    updatedAt: timestamp("updatedAt", { withTimezone: true, mode: "date" }),
  },
  (table) => [index("verification_identifier_idx").on(table.identifier)],
);

export const project = pgTable(
  "project",
  {
    id: text("id").primaryKey(),
    name: text("name").notNull(),
    objective: text("objective").notNull(),
    expectedOutcome: text("expectedOutcome"),
    targetAmountMinor: text("targetAmountMinor").notNull(),
    currency: text("currency").notNull().default("USD"),
    status: text("status").notNull().default("active"),
    nearTreasuryAccount: text("nearTreasuryAccount"),
    nearTreasuryVerifiedAt: timestamp("nearTreasuryVerifiedAt", {
      withTimezone: true,
      mode: "date",
    }),
    nearTreasuryVerifiedBy: text("nearTreasuryVerifiedBy").references(
      () => user.id,
      { onDelete: "set null" },
    ),
    createdBy: text("createdBy")
      .notNull()
      .references(() => user.id, { onDelete: "restrict" }),
    createdAt: timestamp("createdAt", { withTimezone: true, mode: "date" })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updatedAt", { withTimezone: true, mode: "date" })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    index("project_created_by_idx").on(table.createdBy),
    index("project_status_idx").on(table.status),
  ],
);

export const projectMember = pgTable(
  "projectMember",
  {
    projectId: text("projectId")
      .notNull()
      .references(() => project.id, { onDelete: "cascade" }),
    userId: text("userId")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    role: text("role").notNull(),
    joinedAt: timestamp("joinedAt", { withTimezone: true, mode: "date" })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    primaryKey({ columns: [table.projectId, table.userId] }),
    index("project_member_user_idx").on(table.userId),
  ],
);

export const invitation = pgTable(
  "invitation",
  {
    id: text("id").primaryKey(),
    projectId: text("projectId")
      .notNull()
      .references(() => project.id, { onDelete: "cascade" }),
    tokenHash: text("tokenHash").notNull(),
    role: text("role").notNull(),
    expiresAt: timestamp("expiresAt", { withTimezone: true, mode: "date" }).notNull(),
    revokedAt: timestamp("revokedAt", { withTimezone: true, mode: "date" }),
    acceptedAt: timestamp("acceptedAt", { withTimezone: true, mode: "date" }),
    acceptedBy: text("acceptedBy").references(() => user.id, {
      onDelete: "set null",
    }),
    createdBy: text("createdBy")
      .notNull()
      .references(() => user.id, { onDelete: "restrict" }),
    createdAt: timestamp("createdAt", { withTimezone: true, mode: "date" })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    uniqueIndex("invitation_token_hash_idx").on(table.tokenHash),
    index("invitation_project_idx").on(table.projectId),
  ],
);

export const activityEvent = pgTable(
  "activityEvent",
  {
    id: text("id").primaryKey(),
    projectId: text("projectId")
      .notNull()
      .references(() => project.id, { onDelete: "cascade" }),
    actorId: text("actorId").references(() => user.id, {
      onDelete: "set null",
    }),
    action: text("action").notNull(),
    entityType: text("entityType").notNull(),
    entityId: text("entityId").notNull(),
    details: text("details").notNull(),
    createdAt: timestamp("createdAt", { withTimezone: true, mode: "date" })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    index("activity_project_created_idx").on(table.projectId, table.createdAt),
  ],
);

export const contribution = pgTable(
  "contribution",
  {
    id: text("id").primaryKey(),
    projectId: text("projectId")
      .notNull()
      .references(() => project.id, { onDelete: "cascade" }),
    contributorId: text("contributorId")
      .notNull()
      .references(() => user.id, { onDelete: "restrict" }),
    idempotencyKey: text("idempotencyKey").notNull(),
    amountMinor: text("amountMinor").notNull(),
    currency: text("currency").notNull().default("USD"),
    source: text("source").notNull().default("user_reported"),
    status: text("status").notNull().default("reported"),
    note: text("note"),
    receivedAmountMinor: text("receivedAmountMinor"),
    refundedAmountMinor: text("refundedAmountMinor").notNull().default("0"),
    externalReference: text("externalReference"),
    verificationEvidence: text("verificationEvidence"),
    verifiedAt: timestamp("verifiedAt", { withTimezone: true, mode: "date" }),
    refundEvidence: text("refundEvidence"),
    refundedAt: timestamp("refundedAt", { withTimezone: true, mode: "date" }),
    createdAt: timestamp("createdAt", { withTimezone: true, mode: "date" })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updatedAt", { withTimezone: true, mode: "date" })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    uniqueIndex("contribution_idempotency_idx").on(
      table.projectId,
      table.contributorId,
      table.idempotencyKey,
    ),
    index("contribution_project_created_idx").on(
      table.projectId,
      table.createdAt,
    ),
    check(
      "contribution_status_check",
      sql`${table.status} in ('reported', 'pending', 'confirmed', 'failed', 'expired', 'refunded')`,
    ),
    check(
      "contribution_source_check",
      sql`${table.source} in ('user_reported', 'payment_adapter')`,
    ),
    check(
      "contribution_reported_is_unverified_check",
      sql`${table.source} != 'user_reported' or ${table.status} = 'reported'`,
    ),
    check(
      "contribution_confirmed_evidence_check",
      sql`${table.status} not in ('confirmed', 'refunded') or (${table.source} = 'payment_adapter' and ${table.receivedAmountMinor} is not null and ${table.verificationEvidence} is not null and ${table.verifiedAt} is not null)`,
    ),
    check(
      "contribution_refund_evidence_check",
      sql`${table.refundedAmountMinor} = '0' or (${table.refundEvidence} is not null and ${table.refundedAt} is not null)`,
    ),
    check(
      "contribution_fully_refunded_check",
      sql`${table.status} != 'refunded' or (${table.receivedAmountMinor} = ${table.refundedAmountMinor} and ${table.refundEvidence} is not null and ${table.refundedAt} is not null)`,
    ),
  ],
);

export const nearWalletChallenge = pgTable(
  "nearWalletChallenge",
  {
    id: text("id").primaryKey(),
    projectId: text("projectId")
      .notNull()
      .references(() => project.id, { onDelete: "cascade" }),
    userId: text("userId")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    accountId: text("accountId").notNull(),
    nonce: text("nonce").notNull(),
    expiresAt: timestamp("expiresAt", { withTimezone: true, mode: "date" }).notNull(),
    consumedAt: timestamp("consumedAt", { withTimezone: true, mode: "date" }),
    createdAt: timestamp("createdAt", { withTimezone: true, mode: "date" })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    index("near_wallet_challenge_project_user_idx").on(
      table.projectId,
      table.userId,
      table.expiresAt,
    ),
  ],
);

export const nearIntentPayment = pgTable(
  "nearIntentPayment",
  {
    id: text("id").primaryKey(),
    projectId: text("projectId")
      .notNull()
      .references(() => project.id, { onDelete: "cascade" }),
    contributionId: text("contributionId")
      .notNull()
      .unique()
      .references(() => contribution.id, { onDelete: "cascade" }),
    contributorId: text("contributorId")
      .notNull()
      .references(() => user.id, { onDelete: "restrict" }),
    idempotencyKey: text("idempotencyKey").notNull(),
    correlationId: text("correlationId").notNull().unique(),
    depositAddress: text("depositAddress").notNull().unique(),
    payerAccount: text("payerAccount").notNull(),
    recipientAccount: text("recipientAccount").notNull(),
    originAssetId: text("originAssetId").notNull(),
    destinationAssetId: text("destinationAssetId").notNull(),
    originTokenContract: text("originTokenContract").notNull(),
    destinationTokenContract: text("destinationTokenContract").notNull(),
    amountIn: text("amountIn").notNull(),
    maxAmountIn: text("maxAmountIn"),
    amountOut: text("amountOut").notNull(),
    deadline: timestamp("deadline", { withTimezone: true, mode: "date" }).notNull(),
    status: text("status").notNull().default("PENDING_DEPOSIT"),
    depositTransactionHash: text("depositTransactionHash"),
    destinationTransactionHash: text("destinationTransactionHash"),
    statusEvidence: text("statusEvidence"),
    createdAt: timestamp("createdAt", { withTimezone: true, mode: "date" })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updatedAt", { withTimezone: true, mode: "date" })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    uniqueIndex("near_intent_idempotency_idx").on(
      table.projectId,
      table.contributorId,
      table.idempotencyKey,
    ),
    index("near_intent_project_status_idx").on(
      table.projectId,
      table.status,
      table.createdAt,
    ),
    check(
      "near_intent_amounts_check",
      sql`cast(${table.amountIn} as integer) > 0 and cast(${table.amountOut} as integer) > 0`,
    ),
    check(
      "near_intent_status_check",
      sql`${table.status} in ('PENDING_DEPOSIT', 'KNOWN_DEPOSIT_TX', 'PROCESSING', 'SUCCESS', 'FAILED', 'REFUNDED', 'INCOMPLETE_DEPOSIT', 'EXPIRED', 'VERIFICATION_FAILED')`,
    ),
  ],
);

export const projectSpendingPolicy = pgTable(
  "projectSpendingPolicy",
  {
    projectId: text("projectId")
      .primaryKey()
      .references(() => project.id, { onDelete: "cascade" }),
    perTransactionCapMinor: text("perTransactionCapMinor").notNull(),
    totalAuthorizedCapMinor: text("totalAuthorizedCapMinor").notNull(),
    allowedCategories: text("allowedCategories").notNull(),
    allowedProviders: text("allowedProviders").notNull(),
    agentExecutionAllowed: boolean("agentExecutionAllowed")
      .notNull()
      .default(false),
    version: integer("version").notNull().default(1),
    expiresAt: timestamp("expiresAt", { withTimezone: true, mode: "date" }).notNull(),
    updatedBy: text("updatedBy")
      .notNull()
      .references(() => user.id, { onDelete: "restrict" }),
    updatedAt: timestamp("updatedAt", { withTimezone: true, mode: "date" })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    check(
      "spending_policy_caps_check",
      sql`cast(${table.perTransactionCapMinor} as integer) > 0 and cast(${table.totalAuthorizedCapMinor} as integer) > 0`,
    ),
    check("spending_policy_version_check", sql`${table.version} > 0`),
  ],
);

export const purchaseApproval = pgTable(
  "purchaseApproval",
  {
    id: text("id").primaryKey(),
    projectId: text("projectId")
      .notNull()
      .references(() => project.id, { onDelete: "cascade" }),
    requestorId: text("requestorId")
      .notNull()
      .references(() => user.id, { onDelete: "restrict" }),
    task: text("task").notNull(),
    purpose: text("purpose").notNull(),
    category: text("category").notNull(),
    providerId: text("providerId").notNull(),
    offerReference: text("offerReference").notNull(),
    amountMinor: text("amountMinor").notNull(),
    currency: text("currency").notNull().default("USD"),
    status: text("status").notNull().default("pending"),
    idempotencyKey: text("idempotencyKey").notNull(),
    policyVersion: integer("policyVersion").notNull(),
    expiresAt: timestamp("expiresAt", { withTimezone: true, mode: "date" }).notNull(),
    approverId: text("approverId").references(() => user.id, {
      onDelete: "set null",
    }),
    approvedAt: timestamp("approvedAt", { withTimezone: true, mode: "date" }),
    createdAt: timestamp("createdAt", { withTimezone: true, mode: "date" })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updatedAt", { withTimezone: true, mode: "date" })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    uniqueIndex("purchase_approval_idempotency_idx").on(
      table.projectId,
      table.requestorId,
      table.idempotencyKey,
    ),
    index("purchase_approval_project_status_idx").on(
      table.projectId,
      table.status,
      table.createdAt,
    ),
    check(
      "purchase_approval_status_check",
      sql`${table.status} in ('pending', 'approved', 'rejected', 'revoked', 'expired')`,
    ),
    check(
      "purchase_approval_amount_check",
      sql`cast(${table.amountMinor} as integer) > 0`,
    ),
  ],
);

export const projectTask = pgTable(
  "projectTask",
  {
    id: text("id").primaryKey(),
    projectId: text("projectId")
      .notNull()
      .references(() => project.id, { onDelete: "cascade" }),
    title: text("title").notNull(),
    description: text("description").notNull(),
    category: text("category"),
    estimatedCostMinor: text("estimatedCostMinor"),
    status: text("status").notNull().default("todo"),
    reportedOutcome: text("reportedOutcome"),
    createdBy: text("createdBy")
      .notNull()
      .references(() => user.id, { onDelete: "restrict" }),
    updatedBy: text("updatedBy")
      .notNull()
      .references(() => user.id, { onDelete: "restrict" }),
    createdAt: timestamp("createdAt", { withTimezone: true, mode: "date" })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updatedAt", { withTimezone: true, mode: "date" })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    index("project_task_project_created_idx").on(
      table.projectId,
      table.createdAt,
    ),
    check(
      "project_task_status_check",
      sql`${table.status} in ('todo', 'in_progress', 'blocked', 'completed')`,
    ),
    check(
      "project_task_completed_outcome_check",
      sql`${table.status} != 'completed' or length(trim(coalesce(${table.reportedOutcome}, ''))) >= 10`,
    ),
  ],
);

export const projectRelations = relations(project, ({ many, one }) => ({
  members: many(projectMember),
  invitations: many(invitation),
  activity: many(activityEvent),
  contributions: many(contribution),
  spendingPolicy: one(projectSpendingPolicy, {
    fields: [project.id],
    references: [projectSpendingPolicy.projectId],
  }),
  purchaseApprovals: many(purchaseApproval),
  tasks: many(projectTask),
  nearIntentPayments: many(nearIntentPayment),
}));

export const projectMemberRelations = relations(projectMember, ({ one }) => ({
  project: one(project, {
    fields: [projectMember.projectId],
    references: [project.id],
  }),
  user: one(user, {
    fields: [projectMember.userId],
    references: [user.id],
  }),
}));

export const schema = {
  user,
  session,
  account,
  verification,
  project,
  projectTask,
  projectMember,
  invitation,
  activityEvent,
  contribution,
  nearWalletChallenge,
  nearIntentPayment,
  projectSpendingPolicy,
  purchaseApproval,
};
