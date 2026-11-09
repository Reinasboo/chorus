# ADR 0002: Local application foundation

- **Status:** Accepted for the hackathon implementation
- **Date:** 2026-11-09

## Context

The workspace contained the product vision and build plan but no application, database, authentication, deployment target, or credentials.

## Decision

- Use Next.js App Router, React, TypeScript, Tailwind, and Zod for the initial application.
- Use Better Auth for email/password identity and Drizzle with SQLite for a reproducible local/demo database.
- Keep project membership and authorization in the application domain; do not treat authentication as project authorization.
- Keep payment credentials and transaction signing out of the browser and out of the AI execution context.
- Add unit/integration tests alongside the domain logic they cover.

## Consequences

- A fresh developer can run the demo without provisioning an external database.
- SQLite is suitable for the local single-instance hackathon prototype, not a production multi-instance deployment. Move to PostgreSQL and review transaction/concurrency semantics before production.
- Email verification and delivery are not configured in the initial local build; production launch requires a configured verification flow, rate limiting, secret management, and deployment-specific hardening.
