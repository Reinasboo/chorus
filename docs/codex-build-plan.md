# Chorus — Codex Build Plan

> **Purpose:** Turn [product-vision.md](./product-vision.md) into a staged, verifiable implementation plan for Codex. The vision is the product source of truth; this document is the delivery contract. Build the coherent end-to-end product before expanding into the long-term platform.
>
> **Workspace baseline:** At plan creation, the workspace contains the product vision only. Codex must inspect the current repository and environment before choosing a framework, creating files, or assuming that code, services, credentials, or deployment infrastructure already exist.
>
> **Hackathon timing:** The vision specifies a November 14, 2026 submission deadline. This plan is ordered by dependencies, not by a promise that every item fits the remaining time. Protect a working, demonstrable vertical slice; defer anything that threatens it.

## 1. Product outcome

Chorus is a human-first collaborative finance and execution product, built on NEAR. A project brings its objective, members, contributions, budget, tasks, approved purchases, payment evidence, and deliverables into one auditable space.

The first release must demonstrate one complete business workflow:

1. A project owner creates a campaign project with an objective and a budget.
2. The owner invites participants; members join with appropriate roles.
3. Contributors initiate supported funding routes and can see verified status.
4. Chorus Intelligence turns the objective into proposed tasks and service purchases.
5. A human with authority reviews and approves a purchase under explicit project policy.
6. An agent pays a compatible service through a real, supported MPP flow (using NEAR Intents where the route and recipient are supported).
7. Chorus verifies the payment independently of its contribution ledger, records the service response/deliverable, and reports spent and remaining amounts.

The UI must explain the workflow without requiring users to understand chains, wallets, or payment protocols. Never imply that a simulated or unverified operation is a real payment.

### Product principles

- **Human-first:** Owners and authorized approvers define the objective and retain meaningful control.
- **Collective:** Projects support multiple participants, roles, invitations, and contributions.
- **Intelligent:** AI plans and assists; execution is constrained by policy and approval.
- **Accountable:** Budgets, decisions, payment evidence, task progress, and results are traceable.
- **NEAR is essential:** NEAR integrations must perform real product work, not appear as decorative badges.

## 2. Scope and release boundaries

### Hackathon MVP — required

- Sign-in and a stable user identity; choose the simplest secure authentication supported by the selected stack.
- Project create, read, update, and lifecycle; name, objective, target budget, currency/asset context, owner, and expected outcome.
- Shareable invitation/join flow with expiry or revocation and role-aware access.
- Project membership with at least owner, administrator/approver, and contributor roles.
- Contribution records and a supported funding/payment route with explicit pending, confirmed, failed, expired, and refunded/underpaid handling as applicable to the selected route.
- Budget view separating available, committed/reserved, and spent amounts.
- AI objective-to-task planning, provider discovery for compatible endpoints, and a proposed execution plan.
- Configurable spending authorization: per-transaction cap, total authorized project budget, allowed categories/providers, approval thresholds, agent permissions, expiry, and revocation.
- Human purchase approval with a durable decision record.
- A real, compatible MPP agent payment; a real supported NEAR Intents settlement route for the demonstrated funding/payment flow. Verify end-to-end technical feasibility before promising any specific route.
- Immutable-in-practice activity history (append-only application events), independent settlement verification, and transaction/provider references.
- Task progress, deliverables, completion report, and remaining budget.
- One polished, reproducible business-campaign demonstration.
- Public repository setup/run instructions, tests, and hackathon submission checklist.

### Explicitly not MVP

- Public social feed, native mobile apps, full public marketplace, provider ranking at ecosystem scale.
- Complex multi-agent swarms; start with one coordinator and a small set of bounded tool workflows.
- Custom bridges, unsupported settlement routes, custody assumptions not validated against provider documentation, or unrestricted agent wallet access.
- Native token, advanced confidential treasury, automated recurring purchases, enterprise accounting integrations.
- Full API, SDK, MCP server, provider API, or webhook platform. Define extension seams and contracts only if they do not jeopardize the vertical slice.
- Production financial, legal, compliance, or custody claims. Testnet/demo operation is not production readiness.

### Roadmap after MVP

1. **Chorus Core:** Collaborative projects, invitations, contributions, budgets, AI planning, controlled purchases.
2. **Chorus Business:** Business workspaces, procurement controls, reporting, accounting integrations, recurring budgets, operational automation.
3. **Chorus Network:** Provider onboarding and discovery, external agents, public API/SDK/MCP, provider API, webhooks.
4. **Chorus Everywhere:** Embedded checkout, broader payment integrations, international operations, richer agent coordination, consumer experiences.

## 3. Codex operating instructions

At the start of each phase, Codex should:

1. Inspect repository files, package manifests, existing instructions, git status, and available runtime/tooling. Preserve existing work; do not overwrite or reset user changes.
2. Read this plan and the relevant sections of `product-vision.md`. Reuse established project conventions; if none exist, propose the smallest maintainable stack consistent with the requirements.
3. Identify assumptions and unresolved decisions. Resolve payment, custody, authentication, and provider questions by checking current official NEAR / MPP documentation and recording source URLs and decisions in a concise ADR before implementing dependent logic.
4. Implement one phase at a time in dependency order. Keep changes focused, typed, accessible, and testable. Do not silently substitute mocks for a required real integration.
5. After each phase, run the narrowest meaningful tests, type-check, lint, and build available. Report commands and outcomes, remaining blockers, and any behavior not implemented.
6. Update this plan's checkboxes only when the acceptance criteria are met. Do not claim completion based on a UI-only mock, a local ledger row, or an unverified transaction.

When blocked by a live integration or unavailable credentials, finish the safe interface, deterministic tests, and explicit unavailable/error states. Mark the real integration as blocked; never create success-shaped fake payment evidence.

## 4. Architecture and data boundaries

Keep the web application, project/membership domain, contribution ledger, budget/policy authorization, AI planning, execution, payment adapters, and settlement verification as distinct responsibilities. Use a modular monolith for the MVP unless repository constraints or measured needs require otherwise.

Suggested architecture (adapt after repository inspection):

```text
Web client
  -> authenticated application API
     -> project and membership service
     -> contribution and activity ledger
     -> budget and policy engine
     -> intelligence / provider discovery
     -> approval and execution orchestrator
        -> MPP payment adapter
        -> NEAR Intents adapter (supported routes only)
     -> payment verification and reconciliation
     -> durable jobs for long-running/async operations
  -> relational database
  -> structured logs and operational monitoring
```

Preferred starting stack from the vision: Next.js, React, TypeScript, Tailwind and an accessible component system; TypeScript API services; PostgreSQL with Drizzle or Prisma; authentication appropriate to the repository; NEAR contracts only if the selected custody/settlement design requires them; NEAR AI Cloud behind a provider abstraction; MCP only as a later integration. These are recommendations, not assumptions. Do not introduce a smart contract just to satisfy a checklist.

### Required financial invariants

- **Contribution ledger != settlement proof.** A contribution is confirmed only from independently verified route/provider evidence.
- **Settlement != spending authorization.** Verified funds do not automatically grant an agent permission to spend.
- **Authorization != payment.** Approval records intent and scope; a separate payment operation and verification establish the outcome.
- Store amount as integer base units plus asset/network metadata; never use floating-point arithmetic for money.
- Treat provider callbacks and blockchain events as untrusted, duplicate, delayed, out-of-order inputs. Authenticate, validate, make processing idempotent, and reconcile.
- Enforce policy at the server/payment boundary, not only in the UI or AI prompt. Re-check immediately before execution against current policy, balances, expiry, and revocation.
- Use least privilege, scoped and revocable agent authority. Never expose private keys, unrestricted wallet credentials, or secrets to the model/client.
- Record a durable audit event for material actions: invitation/role changes, contributions/status transitions, budget/policy changes, proposal, approval/rejection, execution attempt/result, verification, refund, deliverable, and completion.
- Make transaction lifecycle explicit (for example `created -> pending -> confirmed | failed | expired`; execution `proposed -> awaiting_approval -> approved -> executing -> succeeded | failed | cancelled`). Permit only valid transitions.
- Never spend pending/unverified contributions. Define how committed funds reserve budget and how failed, expired, underpaid, duplicate, or refunded payments affect available funds.
- Refund semantics, custody, settlement recipient/account type, and supported assets/routes are unresolved until validated against current official integration documentation and the intended test environment. Do not guess.

### Initial domain model

Codex should refine these entities and constraints against the selected database and actual provider APIs:

- `User`, `Project`, `ProjectMember`, `Invitation`
- `Contribution` (project, contributor, requested/received amount, asset, route, status, idempotency key, external reference)
- `Budget` or project budget fields; `BudgetReservation` / `Execution`
- `SpendingPolicy` (caps, categories/providers, thresholds, agent scope, validity and revocation)
- `Task`, `Provider`, `Offer` / service endpoint, `ExecutionPlan`
- `Approval` (approver, decision, approved scope/amount, timestamps, policy snapshot/version)
- `Payment` (purpose, provider, amount/asset, protocol/route, status, external payment and transaction references)
- `SettlementEvidence` (source, verified identity/amount/recipient/asset/network, observed time, verification result)
- `Deliverable`, `ActivityEvent` (append-only), `WebhookDelivery` only when webhooks are in scope.

Define database constraints and authorization checks for ownership, membership, idempotency, amount precision, status transitions, and uniqueness of external payment/event identifiers.

## 5. Build phases and acceptance criteria

### Phase 0 — Repository reconnaissance and delivery setup

- [x] Inspect existing files, git status, runtime, package manager, project conventions, and available deployment/test environment.
- [x] Decide whether to scaffold or extend the existing project; do not assume the workspace is empty after inspection.
- [x] Establish a reproducible local development setup, environment-variable template with names/placeholders only, lint, type-check, and build commands. Add test tooling alongside the first domain behavior rather than installing an unused test stack.
- [x] Add concise project run instructions and a safe configuration/secret policy.
- [x] Maintain a short ADR log for consequential decisions: stack/auth, database, settlement/custody, payment routes, AI provider, and environment.

**Exit check:** A fresh developer can install/configure/run the app and execute its checks using documented steps; no secrets are committed.

### Phase 1 — Payment and policy technical validation (critical path)

- [x] Consult current official NEAR Intents, MPP/NEAR agentic payments, NEAR account/developer, and selected test-network documentation; record exact URLs, API/version assumptions, supported route, asset, recipient account type, and transaction verification method.
- [x] Confirm from current MPP documentation and the NEAR Intents SDK that `nearintents` is a supported MPP `charge` method and record its settlement/trust model.
- [ ] Prove the smallest end-to-end supported test flow: quote/prepare, authorize, pay/settle, identify recipient and amount, independently verify completion. Confirm what is and is not handled by MPP versus Intents.
- [ ] Confirm the agent payment authorization model, service/provider compatibility, limits, timeout behavior, and whether payment can be safely retried.
- [ ] Decide the contribution funding route and whether funds are held, forwarded, or only tracked. Document custody and settlement ownership; do not implement a treasury contract until required and reviewed.
- [ ] Define payment state machines, signature/webhook verification, idempotency, reconciliation, failure/refund handling, testnet configuration, and policy enforcement point.
- [ ] Build adapter interfaces and deterministic tests. Keep test doubles clearly labeled and impossible to confuse with verified live operations.

**Exit check:** The supported MPP/NEAR Intents route and verification lifecycle are documented. The official NEAR Intents quickstart states there is no testnet, so a real settlement smoke test is explicitly blocked until a specific mainnet transaction is separately authorized. Continue other phases with live settlement disabled; the final release remains blocked from claiming real settlement until that test is authorized and verified.

### Phase 2 — Foundation, identity, and collaborative projects

- [x] Implement authentication and stable identity using the simplest suitable, secure method; connect wallet identity only where required by the verified payment flow.
- [x] Create/edit/view projects with objective, target budget, owner, expected outcome, status, and supported asset/currency context.
- [x] Implement role-based membership: owner, administrator/approver, contributor. Enforce access server-side for every project operation.
- [x] Add shareable invitations with unguessable tokens, expiry/revocation, safe redemption, and no leakage of private project data to non-members.
- [x] Build project overview, member list, invitation/join flow, and empty/loading/error states.
- [x] Add audit events for project, invitation, and membership changes.

**Exit check:** Passed API and browser acceptance checks: owner can create a project and issue contributor/admin invitations; invite redemption grants scoped membership; contributor edits, revoked/expired invite redemption, and outsider project reads are rejected. Current lint, typecheck, 31 Vitest tests, and optimized build pass.

### Phase 3 — Contributions, budget accounting, and activity history

- [x] Implement idempotent member-submitted contribution reports; display them as explicitly unverified and do not initiate a transfer.
- [ ] Implement contribution initiation through the validated route; display clear pending/confirmed/failed/expired status.
- [ ] Verify settlement before marking a contribution confirmed; reconcile amount, asset, network, recipient, and provider/external reference.
- [x] Make report creation idempotent and prevent user-reported rows from entering verified totals; provider callbacks/events and their delivery edge cases remain open.
- [x] Calculate reported, pending, verified, and evidenced-refund totals in integer USD minor units; do not aggregate unlike currencies.
- [x] Calculate active authorization reservations and verified funds not reserved under current policy; approval creation/review uses transactional reservations to prevent concurrent over-authorization.
- [ ] Calculate completed expenditure and reconcile execution against reservations; live payment execution is disabled.
- [x] Add database evidence constraints for verified settlements/refunds and record contribution-report activity with actor, timestamp, and source.
- [ ] Complete provider settlement, expiry, failure, refund lifecycle handling, and independent verification/reconciliation.
- [x] Build contribution reports, verified-vs-reported budget summary, and verified progress display; payment transaction detail is still open.

**Current status:** The self-report ledger, server-side membership checks, idempotency, append-only report activity, integer-cent summaries, evidence-gated verified totals, and UI separation are implemented. Active pending/approved reservations and unreserved verified balances are now shown separately using the current policy version and expiry. No contribution payment route or independent settlement verifier is configured, so app-reported records cannot increase verified totals and completed expenditure remains unavailable; the Phase 3 exit check is not met.

**Exit check:** Verified and unverified funds are clearly distinguished; duplicate/failed/expired events do not inflate balances; concurrent reservations cannot exceed policy/budget; audit trail explains every balance change.

### Phase 4 — Intelligence, provider discovery, policy, approvals

- [ ] Configure an AI provider (prefer NEAR AI Cloud where access and requirements permit); the server-side NEAR AI Cloud adapter and optional plan-generation flow are implemented, but no provider credentials are configured.
- [x] Define the planner interface and validate untrusted structured plan output, task estimates, and project-budget totals. Actual plan generation remains unavailable.
- [ ] Discover only configured/compatible service endpoints for MVP; validate provider identity, price, accepted payment method/assets, and service terms before presenting an offer.
- [ ] Present a verified provider offer or AI-generated execution plan; current provider and offer IDs are administrator-entered references, explicitly not verified.
- [x] Implement USD per-purchase/total caps, category/provider allowlists, disabled-by-default agent execution, policy expiry/versioning, and revocation on policy changes.
- [x] Require a project owner/administrator decision for every purchase request; bounded automation and hardcoded illustrative thresholds are not enabled.
- [x] Capture exact task, provider/offer reference, amount, purpose, policy version, approver, and expiry; material policy updates invalidate existing approvals.
- [x] Re-authorize exact scope, current policy, verified contributions, and concurrent reservations before recording approval. Payment-boundary re-authorization, replay protection, and execution remain disabled with payments.

**Current status:** Policy and approval APIs/UI are implemented with server-side checks; approval records never execute payment. Administrators can request a structured draft from NEAR AI Cloud when credentials are configured. The objective and budget are sent to the chosen model; output is validated against the project budget and must be reviewed before tasks are added. No credentials/model are configured by default, proposals are not quotes or spending authorization, and provider discovery remains unavailable. Admin-entered provider references are not offers or proof of service.

**Exit check:** Objective produces reviewable structured tasks; provider/price and plan are visible; unauthorized, expired, revoked, over-cap, disallowed, and changed-scope executions are blocked server-side and covered by tests.

### Phase 5 — Agent execution, MPP, NEAR Intents, verification

- [ ] Implement the smallest reliable coordinator workflow, not an unconstrained autonomous agent or swarm.
- [ ] Integrate one real MPP-compatible service/payment flow following current protocol documentation and validated Phase 1 assumptions.
- [ ] Integrate NEAR Intents only for a currently supported route and purpose proven in Phase 1; keep protocol details behind an adapter.
- [ ] Use durable asynchronous jobs for operations that can outlive a request; track retries, timeouts, cancellation, and terminal states. Retry only when the operation is idempotent or safe to reconcile.
- [ ] Store payment intent and external references before dispatch; verify final settlement independently and match recipient, amount, asset, network, and execution.
- [ ] Protect secrets and signing authority from browser and model; apply minimum scoped credentials/authorization and redaction in logs.
- [ ] Capture provider response and deliverable, associate them with the approved task/payment, and distinguish provider claim from verified payment evidence.
- [ ] Show real-time or refreshable execution/payment status with understandable failure and recovery actions; never report success until verified.

**Current blocker:** No testnet exists for the selected NEAR Intents route; no live payment, wallet authorization, provider, or verifier is configured. A real mainnet transaction requires separate, specific user authorization, which has not been given. Payment execution remains disabled; no adapter may claim success.

**Exit check:** The full campaign purchase completes through a real supported test route; duplicated events, timeout/retry, provider errors, payment failure, and verification mismatch cannot create false success or double-spend.

### Phase 6 — Outcomes, reporting, polish, and demo

- [x] Implement manually managed task statuses and reported outcome records; agent deliverables and a verified project completion summary remain blocked on an execution/verifier lifecycle.
- [x] Present target, verified contributions, available/committed amounts, outstanding tasks, and explicit unavailable states for spend, payment evidence, and post-spend remaining amount until a payment/verifier lifecycle exists.
- [ ] Provide accessible responsive layouts, loading/empty/error states, understandable payment status, and non-technical copy.
- [x] Implement the Red Noir public landing page and responsive authenticated overview/project shells, including truthful treasury status, approval-queue routing, empty states, and mobile navigation.
- [x] Add project-section navigation, actual task-availability disclosure, all/created/shared project filtering, and authenticated account/integration settings.
- [x] Add a membership-scoped activity ledger with project, event-type, participant, date-range, and text filters; distinguish app events from settlement proof.
- [x] Add project-scoped manual task creation/status updates/outcomes, administrator-only task creation, membership authorization, and auditable task events.
- [ ] Add realistic seeded demo data only in an explicitly labeled demo/test environment; demonstrate the real payment path separately from any simulated path.
- [x] Write a reproducible walkthrough for the supported no-payment prototype, including setup, roles, contribution reporting, and policy gates.
- [x] Prepare local setup documentation, architecture/decision notes, and known limitations.
- [ ] Add real test assets/provider endpoint and recovery steps only after a supported test route is validated.
- [x] Publish the project repository with setup and integration limitations documented.
- [x] Prepare a short demonstration video outline for the honest no-payment prototype.
- [ ] Prepare remaining submission materials and recording; verify current official rules before posting.
- [ ] Confirm hackathon submission requirements from the official current source: public repository and public X demo post linked in submission; deadline stated in the vision is November 14, 2026 at 23:59 UTC.

**Current status:** The no-payment prototype walkthrough, demo video outline, and setup limitations are documented, and the repository is public. The Red Noir landing page, responsive workspace/project shell, searchable and filterable project directory, treasury/approval snapshots, project-section navigation, authenticated settings, membership-scoped activity ledger, manual task tracking, and optional AI planning are implemented with truthful integration availability states. AI task categories and estimates are preserved as draft metadata when added to a project; estimates are not quotes. Task outcomes are member-reported, not verified deliverables. Verified available and reserved balances plus outstanding tasks are shown; expenditure, payment evidence, and post-spend remaining amounts are explicitly unavailable until a validated payment/deliverable lifecycle exists. A real payment demo, video recording, public post, and final submission materials are unavailable.

**Exit check:** A fresh reviewer can run the app, complete or reproduce the documented demo, understand which actions are real vs test fixtures, and inspect evidence linking approval, payment, verification, and deliverable.

## 6. Cross-cutting tests and quality gates

Codex should add and run tests in the repository's existing framework; do not introduce a new test stack without need.

### Unit tests

- Money parsing/formatting and base-unit arithmetic; no float rounding.
- Budget reservation and policy evaluation at boundaries, expiry, revocation, provider/category restrictions, and role permissions.
- State-machine transition validity and invariant checks.
- AI output schema validation and provider/offer normalization.
- Idempotency and event identity handling.

### Integration tests

- Database constraints, project authorization, invitations, membership changes, and audit history.
- Payment adapter with deterministic fixtures for quote/intent, pending, verified, failed, expired, underpaid, duplicate, refund, and recipient mismatch cases.
- Concurrent approvals/reservations and transaction rollback behavior.
- AI/provider failure, timeout, malformed output, and safe user-visible error handling.
- Authenticated payment/event callbacks with invalid signatures and replayed events.

### End-to-end acceptance scenario

1. Owner signs in and creates a campaign project with a defined budget.
2. Owner invites members; a contributor joins and initiates a supported contribution.
3. App only counts the contribution as confirmed after independent verification.
4. Coordinator generates tasks and a compatible provider offer.
5. Owner reviews and approves the exact purchase.
6. Agent initiates MPP payment through the validated supported route.
7. App verifies settlement, records service output/deliverable, and updates spent/remaining budget.
8. Project activity timeline and completion report reconcile with the underlying evidence.
9. A user without authority cannot approve, alter policy, access another project, or trigger execution.

### Release gates

- Relevant tests, type-check, lint, and production build pass.
- No secrets, private keys, or live credentials in source, logs, screenshots, or demo fixtures.
- Payment states and limitations are explicit; no mocked integration is presented as live.
- Authorization is server-side and enforced again at execution time.
- Failure, duplicate, expired, underpaid, refunded, and mismatch cases are tested for every live payment route.
- User can inspect what was approved, what was paid, what was verified, and what was delivered.

## 7. Security, reliability, and privacy requirements

- Enforce project membership and role authorization on every read/write endpoint; test cross-project access isolation.
- Validate all client, AI, provider, webhook, and chain-event input. Use allowlisted payment assets, routes, providers, and service categories.
- Protect invitations and session credentials; use expiry, revocation, rate limits, secure cookie/session practices, and CSRF protections as appropriate to the stack.
- Apply replay protection, idempotency keys, signature checks, and reconciliation to external payment events.
- Keep secrets server-side in environment/secret storage; redact sensitive values and payment identifiers where appropriate from logs.
- Restrict agent tools to explicitly exposed operations and scoped project context; require approval before consequential tool execution.
- Add request limits and abuse controls for invite, AI, provider discovery, and payment initiation paths.
- Use database transactions/locking or equivalent concurrency control for reservations and final authorization.
- Explain AI use and avoid sending unnecessary personal/business data to model providers; use private/confidential inference only when verified and needed, not as an assumed MVP dependency.
- Document that blockchain transactions may be irreversible; provide clear confirmation before payment and safe handling for uncertain status.

## 8. Product surfaces and future integration contracts

Keep architecture compatible with, but do not build ahead of MVP:

- **Chorus API:** Create/read projects, inspect authorized budgets, manage contributions, request approved execution.
- **Chorus SDK:** Embed funding and procurement flows.
- **Chorus MCP Server:** Let compatible agents create projects, inspect authorized budgets, request approval, and interact only within scopes.
- **Provider API:** Publish service offers/prices/payment endpoints, accept orders, report delivery.
- **Webhooks:** Notify on contributions, approvals, payments, task completion, and project changes; future implementation needs signatures, retries, event IDs, and delivery logs.
- **External agents/apps/wallets:** Integrate through explicit permissions and stable, versioned interfaces.

Do not expose an unauthenticated budget, payment, or execution interface in anticipation of these future surfaces.

## 9. User segments, growth, business model, and metrics

The MVP is optimized for a creator/business campaign, while the domain should not preclude:

- Everyday group trips, shared gifts/celebrations, student/learning groups, and community initiatives.
- Creator campaigns and digital-team production budgets.
- Business departmental/project procurement, contractor coordination, digital services, and reporting.
- Developer/AI-builder budgets for APIs, compute, datasets, testing, and agent workloads.

Growth opportunities after the vertical slice: shareable project pages, one-tap invites, live contribution progress, templates, completion reports, provider profiles, reusable workflows, and embeddable project creation. Preserve privacy; public project pages must be an explicit owner choice.

Future revenue paths from the vision: free projects, Chorus Pro, business subscriptions, eligible execution fees, API plans, provider plans, and enterprise integrations/support. Avoid a native token as a revenue mechanism.

Track product usefulness, not vanity:

- Projects created and activated; invitation conversion; funded-project rate.
- Project completion rate; repeat project creation.
- Agent execution success; verified payment volume; provider integrations.
- **North-star metric:** completed projects with independently verified expenditure and real deliverables.

Instrumentation must avoid sensitive data and distinguish testnet/demo traffic from production activity.

## 10. NEAR integration and hackathon positioning

Implement only capabilities that are currently documented and validated:

- **NEAR Intents:** Cross-chain payment orchestration when route, asset, recipient, and verification are supported.
- **Machine Payments Protocol (MPP):** Machine-to-machine service payment; verify exact payment flow and adapter responsibilities from current documentation.
- **NEAR AI Cloud:** AI model API/provider option; make it replaceable and do not claim confidential inference unless the chosen route's guarantees are independently confirmed.
- **NEAR smart contracts/account infrastructure:** Use only if required by validated settlement, permission, or accounting design.
- **NEAR Chain Signatures:** Advanced/later capability, not a dependency for MVP.

Positioning to validate against current hackathon rules: primary **Autonomous Business**; secondary **Agent Economy** and **AI Security & Defense**; claim **AI Swarms** or **Social Money** only if the actual product demonstrates them. The story is shared funding + controlled procurement + verified agent payment, not a collection of unfinished tracks.

## 11. Remaining-window delivery priority

Because the vision's earlier November 3–8 work window has elapsed, Codex should first establish actual project state and immediately attempt Phase 1's smallest payment validation. Use the remaining time by protecting this order:

1. **First:** Payment/policy feasibility, then end-to-end vertical slice (Phases 0–1 and the minimum necessary of 2–5).
2. **Next:** Verified contributions, role/approval controls, auditable expenditure and meaningful task result.
3. **Then:** UX polish, reliability cases, reproducible docs/demo, public repository and submission artifacts (Phase 6).
4. **Defer:** Marketplace, broad provider discovery, multi-agent architecture, extensive integrations, and roadmap features.

If a real route is blocked, surface the precise blocker early and preserve a safe, honest demo scope. Do not spend the remaining window polishing screens while the core financial path is unproven.

## 12. Definition of done

The MVP is done only when all are true:

- [ ] Project, invitation, roles, contribution tracking, budget, planning, provider offer, policy, approval, execution, verification, activity, and outcome flow are connected.
- [ ] At least one real supported NEAR-related test payment flow is demonstrated end-to-end and independently verified, with its exact limitations documented.
- [ ] MPP-compatible service purchase is real for the demonstrated provider; the payment and deliverable are linked to the exact authorized purchase.
- [ ] No contribution-ledger entry is represented as settlement proof; no approved purchase bypasses server-side current policy.
- [ ] Failure, duplicate, expiry, underpayment/refund where applicable, replay, and mismatch behaviors are tested and visible.
- [ ] A non-owner cannot access or execute unauthorized actions; revocation and expiry take effect.
- [ ] Tests, type-check, lint, and production build pass; setup and demo instructions work from a clean environment.
- [ ] Public repo and demo submission requirements are met if entering the hackathon.
- [ ] Known limitations and deferred vision features are clearly documented.

## 13. Source of truth and further reading

Use the full product vision for product intent and examples: [product-vision.md](./product-vision.md). The vision names these official resources but does not embed their actual URLs; Codex must locate and verify the current official pages before implementing:

- NEAR Hackathon site, official rules, tracks, builder toolkit, and starter prompts.
- NEAR Intents documentation and Chain Abstraction overview.
- Machine Payments Protocol documentation and NEAR Agentic Payments documentation.
- NEAR AI Cloud API/model documentation.
- NEAR developer documentation and NEAR MPC/Chain Signatures documentation.

Do not rely on time-sensitive claims or assumed asset/chain counts in the vision without confirming current official sources.
