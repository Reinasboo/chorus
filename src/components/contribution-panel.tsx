"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { formatUsdFromMinorUnits } from "@/lib/money";

type ContributionItem = {
  id: string;
  contributorName: string;
  amountMinor: string;
  currency: string;
  source: string;
  status: string;
  note: string | null;
  verifiedAt: string | null;
  createdAt: string;
};

type ContributionSummary = {
  reportedAmountMinor: string;
  pendingAmountMinor: string;
  verifiedAmountMinor: string;
  reservedAmountMinor: string;
  unreservedVerifiedAmountMinor: string;
  activeReservationCount: number;
};

function statusLabel(status: string) {
  switch (status) {
    case "reported":
      return "Reported · not verified";
    case "pending":
      return "Payment pending";
    case "confirmed":
      return "Settlement verified";
    case "failed":
      return "Payment failed";
    case "expired":
      return "Payment expired";
    case "refunded":
      return "Refund verified";
    default:
      return "Unknown status";
  }
}

export function ContributionPanel({
  projectId,
  summary,
  contributions,
}: {
  projectId: string;
  summary: ContributionSummary;
  contributions: ContributionItem[];
}) {
  const router = useRouter();
  const [amount, setAmount] = useState("");
  const [note, setNote] = useState("");
  const [idempotencyKey, setIdempotencyKey] = useState<string | null>(null);
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);

  async function reportContribution(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setMessage("");
    const requestKey = idempotencyKey ?? crypto.randomUUID();
    setIdempotencyKey(requestKey);

    try {
      const response = await fetch(`/api/projects/${projectId}/contributions`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          amount,
          note,
          idempotencyKey: requestKey,
        }),
      });
      const result = (await response.json()) as {
        error?: string;
        message?: string;
        contribution?: { id: string };
      };
      if (!response.ok || !result.contribution) {
        setMessage(result.error ?? "We couldn't record this report.");
        return;
      }

      setAmount("");
      setNote("");
      setIdempotencyKey(null);
      setMessage(result.message ?? "Contribution report recorded.");
      router.refresh();
    } catch (error) {
      setMessage(
        error instanceof Error
          ? error.message || "The contribution service is unavailable."
          : "The contribution service is unavailable.",
      );
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="detail-card contribution-card" id="contributions">
      <div className="detail-card-heading">
        <p className="eyebrow">CONTRIBUTIONS</p>
        <span className="section-count">{contributions.length}</span>
      </div>
      <h2>Contribution ledger</h2>
      <p className="muted">
        Reports are unverified and do not transfer funds. Verified amounts only
        appear after independent settlement evidence is checked.
      </p>

      <div className="contribution-summary">
        <span>
          Reported{" "}
          <strong>{formatUsdFromMinorUnits(summary.reportedAmountMinor)}</strong>
        </span>
        <span>
          Pending{" "}
          <strong>{formatUsdFromMinorUnits(summary.pendingAmountMinor)}</strong>
        </span>
        <span>
          Verified{" "}
          <strong>{formatUsdFromMinorUnits(summary.verifiedAmountMinor)}</strong>
        </span>
        <span>
          Reserved authorization{" "}
          <strong>{formatUsdFromMinorUnits(summary.reservedAmountMinor)}</strong>
        </span>
        <span>
          Verified, unreserved{" "}
          <strong>{formatUsdFromMinorUnits(summary.unreservedVerifiedAmountMinor)}</strong>
        </span>
      </div>
      <p className="reservation-note">
        {summary.activeReservationCount} active pending or approved authorization
        {summary.activeReservationCount === 1 ? "" : "s"} reserve funds for policy
        checks; they do not represent payment or expenditure.
      </p>

      <form className="contribution-form" onSubmit={reportContribution}>
        <label>
          Amount reported (USD)
          <input
            type="number"
            min="0.01"
            max="999999999.99"
            step="0.01"
            required
            value={amount}
            onChange={(event) => {
              setAmount(event.currentTarget.value);
              setIdempotencyKey(null);
            }}
          />
        </label>
        <label>
          Note (optional)
          <input
            type="text"
            maxLength={500}
            value={note}
            onChange={(event) => {
              setNote(event.currentTarget.value);
              setIdempotencyKey(null);
            }}
          />
        </label>
        <button className="button button-secondary" disabled={busy}>
          {busy ? "Recording report…" : "Report contribution"}
        </button>
      </form>

      {message && <p className="inline-message" role="status">{message}</p>}

      {contributions.length > 0 ? (
        <ol className="contribution-list">
          {contributions.map((item) => (
            <li key={item.id}>
              <span className="contribution-amount">
                {formatUsdFromMinorUnits(item.amountMinor)}
              </span>
              <span className="contribution-copy">
                <strong>{item.contributorName}</strong>
                <small>
                  {statusLabel(item.status)} ·{" "}
                  {new Date(item.createdAt).toLocaleDateString("en-US", {
                    timeZone: "UTC",
                    month: "short",
                    day: "numeric",
                    year: "numeric",
                  })}
                </small>
                {item.note && <small>{item.note}</small>}
              </span>
            </li>
          ))}
        </ol>
      ) : (
        <p className="muted">No contribution reports yet.</p>
      )}
    </section>
  );
}
