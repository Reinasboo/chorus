"use client";

import { useCallback, useEffect, useState } from "react";

type PolicyView = {
  perTransactionCapMinor: string;
  totalAuthorizedCapMinor: string;
  allowedCategories: string[];
  allowedProviders: string[];
  agentExecutionAllowed: boolean;
  version: number;
  expiresAt: string;
};

type ApprovalView = {
  id: string;
  task: string;
  purpose: string;
  category: string;
  providerId: string;
  offerReference: string;
  amountMinor: string;
  currency: string;
  status: string;
  requestorName: string;
  approverName: string | null;
  expiresAt: string;
};

function usdInput(amountMinor: string) {
  const amount = BigInt(amountMinor);
  return `${amount / BigInt(100)}.${(amount % BigInt(100)).toString().padStart(2, "0")}`;
}

export function SpendingControls({
  projectId,
  canManage,
}: {
  projectId: string;
  canManage: boolean;
}) {
  const [policy, setPolicy] = useState<PolicyView | null>(null);
  const [approvals, setApprovals] = useState<ApprovalView[]>([]);
  const [perTransactionCap, setPerTransactionCap] = useState("25.00");
  const [totalAuthorizedCap, setTotalAuthorizedCap] = useState("100.00");
  const [allowedCategories, setAllowedCategories] = useState("design");
  const [allowedProviders, setAllowedProviders] = useState("");
  const [expiresInDays, setExpiresInDays] = useState("30");
  const [task, setTask] = useState("");
  const [purpose, setPurpose] = useState("");
  const [category, setCategory] = useState("");
  const [providerId, setProviderId] = useState("");
  const [offerReference, setOfferReference] = useState("");
  const [amount, setAmount] = useState("");
  const [requestKey, setRequestKey] = useState<{ signature: string; key: string } | null>(null);
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    const [policyResponse, approvalsResponse] = await Promise.all([
      fetch(`/api/projects/${projectId}/policy`),
      fetch(`/api/projects/${projectId}/approvals`),
    ]);
    const policyResult = (await policyResponse.json()) as {
      error?: string;
      policy?: PolicyView | null;
    };
    const approvalsResult = (await approvalsResponse.json()) as {
      error?: string;
      approvals?: ApprovalView[];
    };
    if (!policyResponse.ok || !approvalsResponse.ok) {
      throw new Error(
        policyResult.error ??
          approvalsResult.error ??
          "Could not load spending controls.",
      );
    }

    return {
      policy: policyResult.policy ?? null,
      approvals: approvalsResult.approvals ?? [],
    };
  }, [projectId]);

  const applyLoadedState = useCallback((result: {
    policy: PolicyView | null;
    approvals: ApprovalView[];
  }) => {
    setPolicy(result.policy);
    setApprovals(result.approvals);
    if (result.policy) {
      setPerTransactionCap(usdInput(result.policy.perTransactionCapMinor));
      setTotalAuthorizedCap(usdInput(result.policy.totalAuthorizedCapMinor));
      setAllowedCategories(result.policy.allowedCategories.join(", "));
      setAllowedProviders(result.policy.allowedProviders.join(", "));
    }
  }, []);

  const refresh = useCallback(async () => {
    applyLoadedState(await load());
  }, [applyLoadedState, load]);

  useEffect(() => {
    let active = true;
    void load()
      .then((result) => {
        if (active) applyLoadedState(result);
      })
      .catch((error: unknown) => {
        if (active) {
          setMessage(
            error instanceof Error
              ? error.message
              : "Could not load spending controls.",
          );
        }
      });
    return () => {
      active = false;
    };
  }, [applyLoadedState, load]);

  async function send(
    url: string,
    method: "PUT" | "POST" | "PATCH",
    body: unknown,
  ) {
    const response = await fetch(url, {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const result = (await response.json()) as { error?: string };
    if (!response.ok) {
      throw new Error(result.error ?? "The spending control request failed.");
    }
    return result;
  }

  async function savePolicy(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setMessage("");
    try {
      await send(`/api/projects/${projectId}/policy`, "PUT", {
        perTransactionCap,
        totalAuthorizedCap,
        allowedCategories: allowedCategories.split(",").map((item) => item.trim()).filter(Boolean),
        allowedProviders: allowedProviders.split(",").map((item) => item.trim()).filter(Boolean),
        expiresInDays: Number(expiresInDays),
      });
      await refresh();
      setMessage("Policy saved. Existing requests were invalidated.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Could not save policy.");
    } finally {
      setBusy(false);
    }
  }

  async function requestPurchase(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setMessage("");
    const signature = JSON.stringify([
      task,
      purpose,
      category,
      providerId,
      offerReference,
      amount,
    ]);
    const idempotencyKey =
      requestKey?.signature === signature ? requestKey.key : crypto.randomUUID();
    setRequestKey({ signature, key: idempotencyKey });
    try {
      await send(`/api/projects/${projectId}/approvals`, "POST", {
        task,
        purpose,
        category,
        providerId,
        offerReference,
        amount,
        idempotencyKey,
      });
      setTask("");
      setPurpose("");
      setCategory("");
      setProviderId("");
      setOfferReference("");
      setAmount("");
      setRequestKey(null);
      await refresh();
      setMessage("Approval request recorded. No payment was executed.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Could not request approval.");
    } finally {
      setBusy(false);
    }
  }

  async function decide(approvalId: string, decision: "approved" | "rejected") {
    setBusy(true);
    setMessage("");
    try {
      await send(
        `/api/projects/${projectId}/approvals/${approvalId}`,
        "PATCH",
        { decision },
      );
      await refresh();
      setMessage(
        decision === "approved"
          ? "Scope approved. Payment execution remains disabled."
          : "Purchase request rejected.",
      );
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Could not update approval.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="detail-card spending-card" id="approvals">
      <div className="detail-card-heading">
        <p className="eyebrow">CONTROLLED SPENDING</p>
        <span className="section-count">{approvals.length}</span>
      </div>
      <h2>Policy and approvals</h2>
      <p className="muted">
        Provider IDs and offer references are administrator-entered and not
        independently verified. An approval authorizes only the displayed scope;
        it never executes payment.
      </p>

      {canManage && (
        <form className="spending-form" onSubmit={savePolicy}>
          <h3>{policy ? `Policy v${policy.version}` : "Set a spending policy"}</h3>
          <div className="form-row">
            <label>
              Per-purchase cap (USD)
              <input
                type="number"
                min="0.01"
                step="0.01"
                required
                value={perTransactionCap}
                onChange={(event) => setPerTransactionCap(event.currentTarget.value)}
              />
            </label>
            <label>
              Total authorization cap (USD)
              <input
                type="number"
                min="0.01"
                step="0.01"
                required
                value={totalAuthorizedCap}
                onChange={(event) => setTotalAuthorizedCap(event.currentTarget.value)}
              />
            </label>
          </div>
          <label>
            Allowed categories (comma-separated)
            <input
              required
              maxLength={500}
              value={allowedCategories}
              onChange={(event) => setAllowedCategories(event.currentTarget.value)}
            />
          </label>
          <label>
            Allowed provider IDs (comma-separated)
            <input
              required
              maxLength={1000}
              value={allowedProviders}
              onChange={(event) => setAllowedProviders(event.currentTarget.value)}
            />
          </label>
          <label>
            Policy expiry (days)
            <input
              type="number"
              min="1"
              max="90"
              step="1"
              required
              value={expiresInDays}
              onChange={(event) => setExpiresInDays(event.currentTarget.value)}
            />
          </label>
          <button className="button button-secondary" disabled={busy}>
            Save policy
          </button>
        </form>
      )}

      <form className="spending-form" onSubmit={requestPurchase}>
        <h3>Request a purchase approval</h3>
        <label>
          Task
          <input required minLength={2} maxLength={120} value={task} onChange={(event) => setTask(event.currentTarget.value)} />
        </label>
        <label>
          Purpose
          <textarea required minLength={10} maxLength={1000} value={purpose} onChange={(event) => setPurpose(event.currentTarget.value)} />
        </label>
        <div className="form-row">
          <label>
            Category
            <input required maxLength={80} value={category} onChange={(event) => setCategory(event.currentTarget.value)} />
          </label>
          <label>
            Provider ID
            <input required maxLength={80} value={providerId} onChange={(event) => setProviderId(event.currentTarget.value)} />
          </label>
        </div>
        <div className="form-row">
          <label>
            Offer reference
            <input required maxLength={128} value={offerReference} onChange={(event) => setOfferReference(event.currentTarget.value)} />
          </label>
          <label>
            Amount (USD)
            <input type="number" min="0.01" step="0.01" required value={amount} onChange={(event) => setAmount(event.currentTarget.value)} />
          </label>
        </div>
        <button className="button button-secondary" disabled={busy || !policy}>
          Request approval
        </button>
      </form>

      {message && <p className="inline-message" role="status">{message}</p>}
      {approvals.length > 0 ? (
        <ul className="approval-list">
          {approvals.map((approval) => (
            <li key={approval.id}>
              <div>
                <strong>{approval.task} · {usdInput(approval.amountMinor)} USD</strong>
                <small>
                  {approval.providerId} / {approval.offerReference} · {approval.status}
                </small>
                <small>
                  Requested by {approval.requestorName}
                  {approval.approverName ? ` · reviewed by ${approval.approverName}` : ""}
                </small>
                <small>Expires {new Date(approval.expiresAt).toLocaleString()}</small>
              </div>
              {canManage && approval.status === "pending" && (
                <span className="approval-actions">
                  <button type="button" className="text-button" disabled={busy} onClick={() => decide(approval.id, "approved")}>
                    Approve
                  </button>
                  <button type="button" className="text-button" disabled={busy} onClick={() => decide(approval.id, "rejected")}>
                    Reject
                  </button>
                </span>
              )}
            </li>
          ))}
        </ul>
      ) : (
        <p className="muted">No purchase approval requests.</p>
      )}
    </section>
  );
}
