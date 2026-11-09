# Chorus local demo

This walkthrough demonstrates identity, project collaboration, unverified contribution reporting, and server-enforced spending controls. It does not simulate or claim a payment, AI-generated plan, provider offer, or settlement.

## Start the app

Follow the local setup instructions in the [README](../README.md), then run:

```powershell
npm run dev
```

Open `http://localhost:3000` and create an owner account with an email address you control. Email verification is not configured in this prototype.

## Create a shared project

1. Create a project with an objective, target USD budget, and expected outcome.
2. Open the project and create a contributor invitation.
3. Use a separate browser profile to create a second account and accept the invitation.
4. Confirm the contributor can read the project but cannot edit owner-controlled settings.
5. As the owner, try an administrator invitation and revoke it before accepting it.

Invitation links are one-use and expire; the project activity list records their creation, acceptance, and revocation.

## Track project work

1. As the owner or an administrator, add a task with a title and description.
2. A project member can change its status or add a reported outcome.
3. Completing a task requires a non-empty reported outcome; the interface labels it as unverified.
4. Confirm task events appear in the project's activity and the workspace Activity ledger.

Tasks are manually managed. They do not dispatch agents, call providers, or authorize payments.

## Demonstrate the contribution ledger

1. As a project member, enter an amount in **Contribution ledger** and submit it.
2. Confirm it appears as **Reported · not verified** and contributes only to the reported total.
3. Confirm the verified amount remains `$0.00`; no payment is initiated or implied.

## Demonstrate spending controls

1. As the owner, configure a spending policy with a USD transaction cap, total cap, allowed category/provider IDs, and expiry.
2. A member can submit a request that exactly names a task, purpose, category, provider ID, offer reference, and amount.
3. The server rejects requests that exceed policy or are not covered by independently verified contributions. Current app-generated reports are unverified, so they cannot fund approvals.
4. Policy changes revoke prior approval records. An owner/administrator approval only records a decision; payment execution remains disabled.

Provider IDs and offer references entered in the policy are labels, not verified endpoints or offers.

## Quality checks

```powershell
npm run lint
npm run typecheck
npm test
npm run build
```

## Not part of this demo

- No live or testnet payment is available for the selected NEAR Intents route.
- No wallet signing, custody, provider discovery, or independently verified settlement is configured.
- No AI provider is configured; only structured model-output validation is implemented.
- No contribution, approval, or local database entry should be presented as evidence of transferred funds.
