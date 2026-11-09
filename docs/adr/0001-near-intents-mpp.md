# ADR 0001: NEAR Intents and MPP payment boundary

- **Status:** Accepted for implementation planning; live mainnet settlement is not authorized by this decision.
- **Date:** 2026-11-09

## Context

The product vision calls for MPP-compatible agent service purchases and NEAR Intents settlement. The first release must not conflate an approval record or contribution ledger entry with settlement evidence.

Current official documentation reviewed:

- [NEAR Intents 1Click quickstart](https://docs.near-intents.org/integration/distribution-channels/1click-api/quickstart/introduction): explicitly says there is no NEAR Intents testnet.
- [1Click API overview](https://docs.near-intents.org/integration/distribution-channels/1click-api/about-1click-api): quote/deposit/status flow; describes quote-specific deposit addresses and settlement.
- [1Click request flow](https://docs.near-intents.org/integration/distribution-channels/1click-api/quickstart/making-a-request): routes, quote fields, deposit and status lifecycle including incomplete deposits, refunds, and failures.
- [MPP payment methods](https://mpp.dev/payment-methods): lists `nearintents` as an MPP payment method.
- [MPP NEAR Intents method](https://mpp.dev/payment-methods/nearintents): identifies `@defuse-protocol/nearintents-mpp-sdk`, single-use challenge-bound deposit addresses, exact merchant output, and supported MPP `charge` intent. It also explicitly says settlement is not trustless during the swap.
- [MPP agent-spend guide](https://mpp.dev/guides/managing-agent-spend): stresses scoped spend controls and method-specific payment rails.

The documented MPP/NEAR Intents integration exists, but its settlement path cannot be safely exercised as a testnet transaction. A live transaction can move real assets and may be irreversible.

## Decision

1. Keep MPP and NEAR Intents behind a server-side payment adapter boundary. The adapter may prepare and inspect a payment challenge/quote, but must not sign or submit a transfer without a separate, explicit human confirmation.
2. Do not claim or implement a testnet NEAR Intents transaction. Do not use a paid mainnet quote or transfer during development without the user explicitly authorizing that specific transaction.
3. Keep payment intent, approval, provider response, and independently verified settlement as separate records and states.
4. Bind approval to the exact provider, amount, asset, route, recipient, policy version, and expiry. Reject stale, changed, expired, or revoked authorization before payment.
5. Treat MPP receipts and provider responses as protocol evidence to validate; independently reconcile settlement status and exact recipient/amount/asset before marking expenditure verified.
6. Clearly label any fixture or simulated integration. It must not be presented as a real payment or verified contribution.
7. Re-check the current MPP SDK/API documentation and package behavior before implementation. This ADR records documentation findings, not a claim that the integration has already been tested.

## Consequences

- Safe offline development and deterministic adapter tests can proceed without a funded wallet.
- Mainnet end-to-end verification is a release blocker unless separately authorized and performed with an explicitly confirmed amount and destination.
- The interface must distinguish `proposed`, `awaiting approval`, `authorized`, `payment pending`, `verified`, and failure/refund states.
- The application must explain the temporary trust/custody model and quote expiry before a user confirms payment.
- If live NEAR Intents settlement is not authorized, the release must disclose that limitation rather than labeling a mock as a completed payment.
