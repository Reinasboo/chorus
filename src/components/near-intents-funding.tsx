"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useNearWallet } from "near-connect-hooks";

type PaymentQuote = {
  id: string;
  correlationId: string;
  depositAddress: string;
  payerAccount: string;
  recipientAccount: string;
  originAssetId: string;
  originTokenContract: string;
  destinationAssetId: string;
  amountIn: string;
  amountInFormatted?: string;
  minAmountIn: string | null;
  maxAmountIn: string | null;
  amountOut: string;
  amountOutFormatted?: string;
  deadline: string;
  status: string;
};

type PaymentStatus = {
  id: string;
  status: string;
  correlationId: string;
  destinationTransactionHash: string | null;
  statusNotice?: string;
  updatedAt: string;
};

const terminalStatuses = [
  "SUCCESS",
  "FAILED",
  "REFUNDED",
  "INCOMPLETE_DEPOSIT",
  "EXPIRED",
  "VERIFICATION_FAILED",
];

function formatAtomic(amount: string, decimals: number, precision: number) {
  const value = BigInt(amount);
  const base = BigInt(10) ** BigInt(decimals);
  const whole = (value / base).toString();
  const fraction = (value % base)
    .toString()
    .padStart(decimals, "0")
    .slice(0, precision)
    .replace(/0+$/, "");
  return fraction ? `${whole}.${fraction}` : whole;
}

function statusLabel(status: string) {
  switch (status) {
    case "PENDING_DEPOSIT":
      return "Awaiting wallet deposit";
    case "KNOWN_DEPOSIT_TX":
      return "Deposit detected";
    case "PROCESSING":
      return "NEAR Intents is processing the swap";
    case "SUCCESS":
      return "1Click reports success · chain check pending";
    case "REFUNDED":
      return "NEAR Intents reports the deposit was refunded";
    case "INCOMPLETE_DEPOSIT":
      return "Deposit was incomplete; check the refund status";
    case "EXPIRED":
      return "Quote expired";
    case "VERIFICATION_FAILED":
      return "Settlement details did not match the quote";
    case "FAILED":
      return "NEAR Intents reported that the swap failed";
    default:
      return status;
  }
}

export function NearIntentsFunding({
  projectId,
  treasuryAccount,
  isActive,
}: {
  projectId: string;
  treasuryAccount: string | null;
  isActive: boolean;
}) {
  const router = useRouter();
  const {
    loading: walletLoading,
    signedAccountId,
    signIn,
    signAndSendTransactions,
  } = useNearWallet();
  const [amount, setAmount] = useState("");
  const [quote, setQuote] = useState<PaymentQuote | null>(null);
  const [quoteExpired, setQuoteExpired] = useState(false);
  const [status, setStatus] = useState<PaymentStatus | null>(null);
  const [activeIntentId, setActiveIntentId] = useState<string | null>(null);
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!quote) return;
    const delay = Math.max(0, new Date(quote.deadline).getTime() - Date.now());
    const timer = setTimeout(() => setQuoteExpired(true), delay);
    return () => clearTimeout(timer);
  }, [quote]);

  useEffect(() => {
    if (!activeIntentId) return;
    let active = true;
    let timer: ReturnType<typeof setTimeout>;
    const poll = async () => {
      try {
        const response = await fetch(
          `/api/projects/${projectId}/near-intents/${activeIntentId}`,
        );
        const result = (await response.json()) as PaymentStatus & {
          error?: string;
        };
        if (!response.ok) {
          throw new Error(result.error ?? "Could not check NEAR Intents status.");
        }
        if (!active) return;
        setStatus(result);
        setMessage(result.statusNotice ?? "");
        if (terminalStatuses.includes(result.status)) {
          setActiveIntentId(null);
          router.refresh();
          return;
        }
      } catch (error) {
        if (active) {
          setMessage(
            error instanceof Error
              ? error.message
              : "NEAR Intents status is temporarily unavailable.",
          );
        }
      }
      if (active) timer = setTimeout(() => void poll(), 5000);
    };
    void poll();
    return () => {
      active = false;
      clearTimeout(timer);
    };
  }, [activeIntentId, projectId, router]);

  async function connectWallet() {
    setBusy(true);
    setMessage("");
    try {
      await signIn();
    } catch (error) {
      setMessage(
        error instanceof Error ? error.message : "Could not connect a NEAR wallet.",
      );
    } finally {
      setBusy(false);
    }
  }

  async function requestQuote(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!signedAccountId) {
      setMessage("Connect a NEAR wallet before requesting a quote.");
      return;
    }
    setBusy(true);
    setMessage("");
    setStatus(null);
    setActiveIntentId(null);
    try {
      const response = await fetch(`/api/projects/${projectId}/near-intents`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          amount,
          payerAccount: signedAccountId,
          idempotencyKey: crypto.randomUUID(),
        }),
      });
      const result = (await response.json()) as {
        payment?: PaymentQuote;
        error?: string;
      };
      if (!response.ok || !result.payment) {
        throw new Error(result.error ?? "Could not request a NEAR Intents quote.");
      }
      setQuote(result.payment);
      setQuoteExpired(false);
      setMessage(
        "Quote ready. Review the amount, recipient, fees, and expiry before signing in your wallet.",
      );
    } catch (error) {
      setMessage(
        error instanceof Error
          ? error.message
          : "NEAR Intents quote service is unavailable.",
      );
    } finally {
      setBusy(false);
    }
  }

  async function sendDeposit() {
    if (!quote || !signedAccountId) return;
    if (quote.payerAccount !== signedAccountId) {
      setMessage("Reconnect the wallet used to request this quote.");
      return;
    }
    if (new Date(quote.deadline).getTime() <= Date.now()) {
      setMessage("This quote expired. Request a fresh quote before depositing.");
      return;
    }
    setBusy(true);
    setMessage("");
    try {
      const outcomes = await signAndSendTransactions({
        transactions: [
          {
            receiverId: "wrap.near",
            actions: [
              {
                type: "FunctionCall",
                params: {
                  methodName: "near_deposit",
                  args: {},
                  gas: "30000000000000",
                  deposit: quote.amountIn,
                },
              },
              {
                type: "FunctionCall",
                params: {
                  methodName: "ft_transfer",
                  args: {
                    receiver_id: quote.depositAddress,
                    amount: quote.amountIn,
                  },
                  gas: "50000000000000",
                  deposit: "1",
                },
              },
            ],
          },
        ],
      });
      const transactionHash = outcomes[0]?.transaction?.hash;
      if (!transactionHash) {
        throw new Error("NEAR wallet returned no deposit transaction hash.");
      }

      setStatus({
        id: quote.id,
        status: "PENDING_DEPOSIT",
        correlationId: quote.correlationId,
        destinationTransactionHash: null,
        updatedAt: new Date().toISOString(),
      });
      setActiveIntentId(quote.id);

      const response = await fetch(
        `/api/projects/${projectId}/near-intents/${quote.id}`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ transactionHash }),
        },
      );
      const result = (await response.json()) as {
        error?: string;
        transactionRecorded?: boolean;
      };
      if (!response.ok && !result.transactionRecorded) {
        throw new Error(result.error ?? "The deposit was sent but could not be tracked.");
      }
      setMessage(
        result.error ??
          "Deposit sent. Waiting for NEAR Intents to confirm the settlement.",
      );
      router.refresh();
    } catch (error) {
      setMessage(
        error instanceof Error
          ? error.message
          : "The NEAR deposit could not be submitted.",
      );
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="near-intents-funding">
      <div className="detail-card-heading">
        <p className="eyebrow">NEAR INTENTS · MAINNET</p>
        <span className="section-count">
          {treasuryAccount ? "Ready" : "Needs treasury"}
        </span>
      </div>
      <h3>Fund with NEAR</h3>
      <p>
        Swap wNEAR for an exact USDC amount, delivered to the project&apos;s
        verified NEAR account. The NEAR wallet signs the deposit; Chorus never
        holds keys.
      </p>
      {!treasuryAccount ? (
        <p className="inline-message">
          A project administrator must verify a NEAR treasury account before
          funding is available.
        </p>
      ) : !isActive ? (
        <p className="inline-message">
          Only active projects can receive contributions.
        </p>
      ) : (
        <>
          <p className="near-mainnet-warning">
            This is a mainnet flow with real assets; NEAR Intents has no
            testnet. USDC is accounted at nominal USD face value, not a
            guaranteed market price. Review the quote and wallet transaction
            before confirming. You also need NEAR for network gas. 1Click
            temporarily handles the swap; its status is not independently
            reconciled against NEAR RPC.
          </p>
          <p className="near-wallet-connected">
            {signedAccountId
              ? `Connected wallet: ${signedAccountId}`
              : "Connect a NEAR mainnet wallet to continue."}
          </p>
          {signedAccountId ? (
            <form className="near-intents-form" onSubmit={requestQuote}>
              <label>
                Contribution amount (USD equivalent)
                <input
                  type="number"
                  min="0.01"
                  max="999999999.99"
                  step="0.01"
                  required
                  value={amount}
                  onChange={(event) => {
                    setAmount(event.currentTarget.value);
                    setQuote(null);
                    setQuoteExpired(false);
                    setStatus(null);
                    setMessage("");
                  }}
                />
              </label>
              <button
                className="button button-secondary"
                disabled={busy || !amount}
              >
                {busy ? "Requesting quote…" : "Get NEAR Intents quote"}
              </button>
            </form>
          ) : (
            <button
              type="button"
              className="button button-secondary"
              disabled={walletLoading || busy}
              onClick={() => void connectWallet()}
            >
              {busy ? "Connecting…" : "Connect NEAR wallet"}
            </button>
          )}
        </>
      )}

      {quote && (
        <div className="near-intents-quote">
          <p>
            Pay{" "}
            <strong>
              {quote.amountInFormatted ??
                `${formatAtomic(quote.amountIn, 24, 6)} wNEAR`}
            </strong>
            {quote.maxAmountIn
              ? ` (maximum ${formatAtomic(quote.maxAmountIn, 24, 6)} wNEAR)`
              : ""}{" "}
            to receive exactly{" "}
            <strong>
              {quote.amountOutFormatted ??
                `${formatAtomic(quote.amountOut, 6, 2)} USDC`}
            </strong>
            .
          </p>
          <small>
            Recipient: {quote.recipientAccount} · Expires{" "}
            {new Date(quote.deadline).toLocaleTimeString()}
          </small>
          <small>
            1Click temporarily handles the swap and may refund unsuccessful
            deposits. Without a configured partner key, its current docs
            disclose an additional 0.25% fee for this quote type.
          </small>
          <button
            type="button"
            className="button button-primary"
            disabled={
              busy ||
              quoteExpired ||
              !signedAccountId ||
              signedAccountId !== quote.payerAccount
            }
            onClick={() => void sendDeposit()}
          >
            {busy ? "Waiting for wallet…" : "Review and send from NEAR wallet"}
          </button>
        </div>
      )}

      {status && (
        <p className="near-intents-status" role="status" aria-live="polite">
          {statusLabel(status.status)}
          {status.destinationTransactionHash && (
            <>
              {" · "}
              <a
                href={`https://explorer.near.org/transactions/${status.destinationTransactionHash}`}
                target="_blank"
                rel="noreferrer"
              >
                View 1Click-reported transaction
              </a>
            </>
          )}
        </p>
      )}
      {message && <p className="inline-message" role="status">{message}</p>}
    </div>
  );
}
