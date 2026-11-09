# ADR 0003: Planning and spending controls

- Status: accepted for the local prototype
- Date: 2026-11-09

## Context

Chorus needs structured planning and bounded purchase approvals, but no AI credentials, verified provider directory, payment route, or settlement verifier is configured. A model response, administrator-entered provider reference, or locally stored approval must not be presented as a verified offer or payment.

## Decisions

- Keep the planner behind a provider interface. Validate untrusted task and cost output against a strict schema and the project target; do not make a model call until a provider and data-handling requirements are configured.
- Support USD purchase limits in integer cents. Policy changes increment a version and revoke pending or approved requests.
- Require owner/administrator approval for every purchase request. A request records the exact task, purpose, provider/offer reference, amount, policy version, and expiry.
- Permit approval requests only when independently verified contributions cover current reservations plus the requested amount. Self-reported contributions do not count.
- Treat provider IDs and offer references as administrator-entered strings, not identity, compatibility, price, or service verification.
- Keep agent execution and payment disabled. An approval record never dispatches a provider request or transfers funds.

## Consequences

The prototype can demonstrate access control, policy evaluation, and exact-scope human approval without claiming autonomous planning or execution. Provider discovery, threshold-based automation, just-in-time payment authorization, settlement verification, and deliverable reconciliation remain blocked on validated integrations and explicit authorization.
