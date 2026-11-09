"use client";

import { useState } from "react";
import { useNearWallet } from "near-connect-hooks";

function base64ToBytes(value: string) {
  return Uint8Array.from(atob(value), (character) => character.charCodeAt(0));
}

export function NearTreasurySettings({
  projectId,
  accountId,
  verifiedAt,
  canManage,
}: {
  projectId: string;
  accountId: string | null;
  verifiedAt: string | null;
  canManage: boolean;
}) {
  const { loading, signedAccountId, signIn, signNEP413Message } = useNearWallet();
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);

  async function verifyTreasury() {
    if (!signedAccountId) {
      await signIn();
      return;
    }

    setBusy(true);
    setMessage("");
    try {
      const challengeResponse = await fetch(
        `/api/projects/${projectId}/near-treasury/challenge`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ accountId: signedAccountId }),
        },
      );
      const challenge = (await challengeResponse.json()) as {
        challengeId?: string;
        accountId?: string;
        nonce?: string;
        recipient?: string;
        message?: string;
        error?: string;
      };
      if (
        !challengeResponse.ok ||
        !challenge.challengeId ||
        !challenge.accountId ||
        !challenge.nonce ||
        !challenge.recipient ||
        !challenge.message
      ) {
        throw new Error(challenge.error ?? "Could not start wallet verification.");
      }

      const signed = await signNEP413Message({
        message: challenge.message,
        recipient: challenge.recipient,
        nonce: base64ToBytes(challenge.nonce),
      });
      if (signed.accountId !== signedAccountId) {
        throw new Error("The connected wallet signed for a different NEAR account.");
      }

      const verifyResponse = await fetch(
        `/api/projects/${projectId}/near-treasury/verify`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            challengeId: challenge.challengeId,
            accountId: signed.accountId,
            publicKey: signed.publicKey,
            signature: signed.signature,
          }),
        },
      );
      const result = (await verifyResponse.json()) as { error?: string };
      if (!verifyResponse.ok) {
        throw new Error(result.error ?? "NEAR account verification failed.");
      }
      setMessage("NEAR treasury verified. No transaction or token transfer was made.");
      window.location.reload();
    } catch (error) {
      setMessage(
        error instanceof Error ? error.message : "NEAR wallet verification failed.",
      );
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="detail-card near-treasury-card">
      <div className="detail-card-heading">
        <p className="eyebrow">NEAR TREASURY</p>
        <span className="section-count">
          {accountId ? "Verified" : "Not configured"}
        </span>
      </div>
      <h2>Project receiving account</h2>
      <p className="muted">
        NEAR Intents contributions settle as USDC on NEAR. The project owner
        proves control of this account with a free NEP-413 wallet signature.
      </p>
      {accountId ? (
        <div className="near-treasury-account">
          <strong>{accountId}</strong>
          <small>
            Verified{" "}
            {verifiedAt
              ? new Date(verifiedAt).toLocaleDateString()
              : "by a project administrator"}
          </small>
        </div>
      ) : (
        <p className="muted">
          Contributions are unavailable until an administrator verifies a
          mainnet NEAR account.
        </p>
      )}
      {canManage && (
        <div className="near-treasury-controls">
          {signedAccountId ? (
            <p className="near-wallet-connected">
              Connected mainnet wallet: <strong>{signedAccountId}</strong>
            </p>
          ) : (
            <p className="muted">Connect the account that should receive USDC.</p>
          )}
          <button
            type="button"
            className="button button-secondary"
            disabled={loading || busy}
            onClick={() => void verifyTreasury()}
          >
            {busy
              ? "Verifying wallet…"
              : signedAccountId
                ? "Verify connected account"
                : "Connect NEAR wallet"}
          </button>
        </div>
      )}
      {message && <p className="inline-message" role="status">{message}</p>}
    </section>
  );
}
