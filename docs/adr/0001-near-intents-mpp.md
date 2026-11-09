# ADR 0001: NEAR Intents and MPP payment boundary

- **Status:** Funding prototype implemented; no real transfer has been tested or authorized by this decision.
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

The documented MPP/NEAR Intents integration exists, but its settlement path cannot be safely exercised as a testnet transaction. A live transaction can move real assets and may be irreversible. The current prototype implements project funding only: a verified NEAR treasury, exact-output wNEAR-to-USDC 1Click quote, contributor-wallet deposit, and quote-bound provider-status check. This does not implement MPP agent purchases and does not independently reconcile destination settlement against NEAR RPC.

## Decision

1. Keep MPP and NEAR Intents behind a server-side payment adapter boundary. The adapter may prepare and inspect a payment challenge/quote, but must not sign or submit a transfer without a separate, explicit human confirmation.
2. Do not claim or implement a testnet NEAR Intents transaction. Do not use a paid mainnet quote or transfer during development without the user explicitly authorizing that specific transaction.
3. Keep payment intent, approval, provider response, and independently verified settlement as separate records and states.
4. Bind approval to the exact provider, amount, asset, route, recipient, policy version, and expiry. Reject stale, changed, expired, or revoked authorization before payment.
5. Treat MPP receipts and provider responses as protocol evidence to validate; independently reconcile settlement status and exact recipient/amount/asset before marking expenditure verified.
6. Clearly label any fixture or simulated integration. It must not be presented as a real payment or verified contribution.
7. Re-check current MPP SDK/API documentation and package behavior before extending the flow. The current funding path is not a real-transaction test or a claim of independent settlement verification.

## Consequences

- Safe offline development and deterministic adapter tests can proceed without a funded wallet.
- The funding path is mainnet-only and has not been end-to-end tested; any real transfer requires separate, explicit authorization for the exact amount and recipient.
- The interface must distinguish `proposed`, `awaiting approval`, `authorized`, `payment pending`, `verified`, and failure/refund states.
- The application must explain the temporary trust/custody model and quote expiry before a user confirms payment.
- The UI must disclose that 1Click temporarily handles swaps and its status is not independently reconciled; do not label a mock or provider response as independently verified settlement.
