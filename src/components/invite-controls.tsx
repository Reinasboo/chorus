"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

type CreatedInvitation = { id: string; url: string; expiresAt: string };
type InvitationRow = {
  id: string;
  role: string;
  expiresAt: string;
  acceptedAt: string | null;
  revokedAt: string | null;
  active: boolean;
};

function formatInvitationDate(value: string) {
  return new Date(value).toLocaleDateString("en-US", {
    timeZone: "UTC",
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export function InviteControls({
  projectId,
  initialInvitations,
  actorRole,
}: {
  projectId: string;
  initialInvitations: InvitationRow[];
  actorRole: string;
}) {
  const router = useRouter();
  const [invitation, setInvitation] = useState<CreatedInvitation | null>(null);
  const [invitations, setInvitations] = useState(initialInvitations);
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const [inviteRole, setInviteRole] = useState<"contributor" | "administrator">(
    "contributor",
  );

  async function createInvitation() {
    setBusy(true);
    setMessage("");
    setInvitation(null);
    try {
      const response = await fetch(`/api/projects/${projectId}/invitations`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ role: inviteRole }),
      });
      const result = (await response.json()) as {
        id?: string;
        url?: string;
        expiresAt?: string;
        error?: string;
      };
      if (!response.ok || !result.id || !result.url || !result.expiresAt) {
        setMessage(result.error ?? "We couldn't create an invitation.");
        return;
      }
      const { id, url, expiresAt } = result;
      setInvitation({
        id,
        url,
        expiresAt,
      });
      setInvitations((current) => [
        {
          id,
          role: inviteRole,
          expiresAt,
          acceptedAt: null,
          revokedAt: null,
          active: true,
        },
        ...current,
      ]);
      router.refresh();
    } catch (error) {
      if (error instanceof Error) {
        setMessage(error.message || "The invitation service is unavailable.");
      } else {
        setMessage("The invitation service is unavailable.");
      }
    } finally {
      setBusy(false);
    }
  }

  async function copyInvitation() {
    if (!invitation) return;
    try {
      await navigator.clipboard.writeText(invitation.url);
      setMessage("Invitation link copied.");
    } catch {
      setMessage("Copy was unavailable. Select and copy the link below.");
    }
  }

  async function revokeInvitation(invitationId: string) {
    setMessage("");
    try {
      const response = await fetch(
        `/api/projects/${projectId}/invitations/${invitationId}`,
        { method: "DELETE" },
      );
      const result = (await response.json()) as { error?: string };
      if (!response.ok) {
        setMessage(result.error ?? "We couldn't revoke this invitation.");
        return;
      }
      setInvitations((current) =>
        current.map((item) =>
          item.id === invitationId
            ? { ...item, revokedAt: new Date().toISOString(), active: false }
            : item,
        ),
      );
      router.refresh();
    } catch (error) {
      if (error instanceof Error) setMessage(error.message);
      else setMessage("We couldn't revoke this invitation.");
    }
  }

  return (
    <div className="invite-controls">
      {actorRole === "owner" && (
        <label className="invite-role-select">
          Invite as
          <select
            value={inviteRole}
            onChange={(event) => {
              const value = event.currentTarget.value;
              if (value === "administrator" || value === "contributor") {
                setInviteRole(value);
              }
            }}
          >
            <option value="contributor">Contributor</option>
            <option value="administrator">Administrator</option>
          </select>
        </label>
      )}
      <button className="button button-secondary" onClick={createInvitation} disabled={busy}>
        {busy
          ? "Preparing link..."
          : inviteRole === "administrator"
            ? "Invite administrator"
            : "Invite contributor"}
      </button>
      {invitation && (
        <div className="invite-result">
          <label>
            Share this one-time link
            <input readOnly value={invitation.url} onFocus={(event) => event.currentTarget.select()} />
          </label>
          <p>Expires {formatInvitationDate(invitation.expiresAt)} · usable once</p>
          <button className="text-button" onClick={copyInvitation}>Copy link</button>
        </div>
      )}
      {invitations.length > 0 && (
        <ul className="invitation-list" aria-label="Project invitations">
          {invitations.map((item) => (
              <li key={item.id}>
                <span>
                  <strong>{item.role}</strong>
                  <small>
                    {item.acceptedAt
                      ? "Accepted"
                      : item.revokedAt
                        ? "Revoked"
                        : item.active
                          ? `Expires ${formatInvitationDate(item.expiresAt)}`
                          : "Expired"}
                  </small>
                </span>
                {item.active && (
                  <button
                    className="text-button"
                    onClick={() => revokeInvitation(item.id)}
                  >
                    Revoke
                  </button>
                )}
              </li>
          ))}
        </ul>
      )}
      {message && <p className="inline-message" role="status">{message}</p>}
    </div>
  );
}

export function AcceptInvitationButton({ token }: { token: string }) {
  const router = useRouter();
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);

  async function accept() {
    setBusy(true);
    setMessage("");
    try {
      const response = await fetch(`/api/invitations/${token}/accept`, {
        method: "POST",
      });
      const result = (await response.json()) as {
        projectId?: string;
        error?: string;
      };
      if (!response.ok || !result.projectId) {
        setMessage(result.error ?? "We couldn't accept this invitation.");
        return;
      }
      router.replace(`/projects/${result.projectId}`);
      router.refresh();
    } catch (error) {
      if (error instanceof Error) {
        setMessage(error.message || "The invitation service is unavailable.");
      } else {
        setMessage("The invitation service is unavailable.");
      }
    } finally {
      setBusy(false);
    }
  }

  return (
    <div>
      <button className="button button-primary" onClick={accept} disabled={busy}>
        {busy ? "Joining project..." : "Accept invitation"}
      </button>
      {message && <p className="form-message" role="alert">{message}</p>}
    </div>
  );
}
