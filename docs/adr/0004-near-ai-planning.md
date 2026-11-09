# ADR 0004: Optional NEAR AI Cloud planning

- **Status:** Accepted for the prototype; provider credentials are not configured.
- **Date:** 2026-11-09

## Context

Chorus has a strict planner-output validator, but no configured model provider. The project objective and budget can contain sensitive business context, and model inference may incur account usage costs. Planning output must not become a provider claim, purchase approval, or payment authorization.

Current official NEAR AI Cloud documentation reviewed:

- [Quickstart](https://docs.near.ai/cloud/quickstart.md): documents an OpenAI-compatible chat-completions API at `https://cloud-api.near.ai/v1/chat/completions`, API-key setup, and account credits.
- [Available models](https://docs.near.ai/cloud/models.md): documents multiple privacy tiers; guarantees differ by model and upstream provider.

## Decision

- Implement a server-side chat-completions adapter. Require `NEAR_AI_API_KEY` and `NEAR_AI_MODEL`; neither is set by default.
- Send only the project objective, expected outcome, and target budget when an authorized project administrator explicitly requests a plan. Never send membership, contribution, approval, or account details.
- Apply a request timeout, validate the provider response and proposed-plan schema, and reject aggregate estimates above the project target.
- Require the administrator to review each suggestion before adding it as a manual project task. Persist its category and estimated USD minor-unit amount as draft task metadata. Estimates are not quotes, provider discovery, purchase approvals, or spending authorization.
- Do not claim confidentiality or TEE guarantees generically. Before use, administrators must review the selected model's current privacy tier and terms.
- Do not persist a generated proposal as an approved execution plan; accepted tasks are stored through the existing audited task API.

## Consequences

- The no-credentials default remains unavailable and cannot make paid model calls.
- Configured inference may incur account charges; setup documentation warns users before enabling it.
- The integration provides draft planning only. Provider discovery, quote verification, plan history, execution, and payment remain separate and unimplemented.
