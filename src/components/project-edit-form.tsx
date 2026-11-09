"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import type { ProjectRole } from "@/lib/project-access";

type Props = {
  projectId: string;
  role: ProjectRole;
  name: string;
  objective: string;
  expectedOutcome: string | null;
  targetAmount: string;
  status: string;
};

export function ProjectEditForm({
  projectId,
  role,
  name,
  objective,
  expectedOutcome,
  targetAmount,
  status,
}: Props) {
  const router = useRouter();
  const [message, setMessage] = useState("");
  const [saved, setSaved] = useState(false);
  const [busy, setBusy] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setMessage("");
    setSaved(false);
    const formData = new FormData(event.currentTarget);
    const payload: Record<string, string> = {
      name: String(formData.get("name") ?? ""),
      objective: String(formData.get("objective") ?? ""),
      expectedOutcome: String(formData.get("expectedOutcome") ?? ""),
      targetAmount: String(formData.get("targetAmount") ?? ""),
    };
    if (role === "owner") {
      payload.status = String(formData.get("status") ?? status);
    }

    try {
      const response = await fetch(`/api/projects/${projectId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const result = (await response.json()) as { error?: string };
      if (!response.ok) {
        setMessage(result.error ?? "We couldn't update this project.");
        return;
      }
      setSaved(true);
      router.refresh();
    } catch (error) {
      if (error instanceof Error) setMessage(error.message);
      else setMessage("The project service is unavailable.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <details className="edit-project">
      <summary>Edit project details</summary>
      <form className="project-form" onSubmit={submit}>
        <label>
          Project name
          <input name="name" defaultValue={name} required minLength={2} maxLength={80} />
        </label>
        <label>
          Objective
          <textarea
            name="objective"
            defaultValue={objective}
            required
            minLength={10}
            maxLength={2000}
            rows={3}
          />
        </label>
        <div className="form-row">
          <label>
            Target budget (USD)
            <input
              name="targetAmount"
              type="number"
              min="0.01"
              max="999999999.99"
              step="0.01"
              defaultValue={targetAmount}
              required
            />
          </label>
          <label>
            Expected outcome
            <input
              name="expectedOutcome"
              defaultValue={expectedOutcome ?? ""}
              maxLength={1000}
            />
          </label>
        </div>
        {role === "owner" && (
          <label>
            Project status
            <select name="status" defaultValue={status} disabled={status !== "active"}>
              <option value="active">Active</option>
              <option value="completed">Completed</option>
              <option value="archived">Archived</option>
            </select>
          </label>
        )}
        {message && <p className="form-message" role="alert">{message}</p>}
        {saved && <p className="inline-message" role="status">Project details saved.</p>}
        <button className="button button-secondary" disabled={busy}>
          {busy ? "Saving..." : "Save changes"}
        </button>
      </form>
    </details>
  );
}
