# Chorus

Chorus is a collaborative finance and execution product: people bring a shared goal, contributions and budgets fund it, and AI helps plan and execute work under human-approved controls.

Product direction and implementation progress:

- [Product vision](./docs/product-vision.md)
- [Codex build plan](./docs/codex-build-plan.md)
- [NEAR Intents / MPP architecture decision](./docs/adr/0001-near-intents-mpp.md)
- [Planning and spending controls decision](./docs/adr/0003-planning-and-spending-controls.md)
- [Optional NEAR AI planning decision](./docs/adr/0004-near-ai-planning.md)
- [Local demo walkthrough](./docs/demo.md)

## Current status

Authentication, local project storage, and an idempotent self-reported contribution ledger are implemented. Live payments, wallet signing, and an AI provider are not configured. A reported contribution is not evidence of funds or settlement.
Spending policies and exact-scope human approval records are available, but provider/offer references are administrator-entered and unverified. Approval records do not trigger execution or payment.
Projects also support manually managed task statuses and reported outcomes. Task outcomes are not independently verified and do not imply agent execution or deliverable acceptance.

The financial architecture must account for the fact that NEAR Intents has no testnet. Any real mainnet payment flow requires explicit user authorization, a confirmed quote and recipient, and an independently verified result. The application must not initiate asset transfers automatically.

## Requirements

- Node.js 24 or a compatible supported Node.js release
- npm

## Run locally

From this directory, create a local environment file and replace the placeholder secret with a random value:

```powershell
Copy-Item .env.example .env.local
$secret = node -e "console.log(require('node:crypto').randomBytes(32).toString('base64'))"
(Get-Content .env.local -Raw).Replace('replace-with-at-least-32-random-characters', $secret) | Set-Content -Encoding ascii .env.local
npm ci
npm run db:generate
npm run db:migrate
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Quality checks

```powershell
npm run lint
npm run typecheck
npm test
npm run build
```

AI planning is optional. To enable it, set `NEAR_AI_API_KEY` and `NEAR_AI_MODEL`
in `.env.local` using a NEAR AI Cloud API key and a model available to your
account. The project objective and target budget are sent to the configured
model when an administrator requests a plan; review the model's data-handling
tier and your account's usage costs first. The server validates returned
structure and budget, but estimates are not quotes or spending authorization.
Keep credentials server-side and never commit `.env.local` or wallet keys.
See the [AI planning decision](./docs/adr/0004-near-ai-planning.md) for the
integration boundary and privacy limitations.

## Integration status

- NEAR Intents / MPP: researched; see the ADR. Live settlement is gated on implementation, credentials, wallet authorization, and explicit human confirmation.
- Database and authentication: Better Auth + local SQLite are implemented for the prototype; production email verification and PostgreSQL migration remain outstanding.
- Contributions: members can record self-reported USD amounts. Reports are shown separately from pending and independently verified settlements; payments remain disabled.
- AI: the NEAR AI Cloud chat-completions adapter and reviewable plan flow are implemented; no API key or model is configured by default. Provider discovery remains unavailable.
- Tasks: project administrators can create tasks and project members can update status and add reported outcomes; optional AI task categories and draft estimates are retained when accepted. No task invokes an agent or service provider, and estimates are not quotes.

## Product direction

The initial end-to-end target is a business campaign project with members, verified contributions, an AI-proposed plan, a human-approved purchase, a compatible provider deliverable, and a reconciled expenditure report. Public marketplace, multi-agent swarms, mobile apps, token issuance, and broad API/SDK integrations are later roadmap items.
