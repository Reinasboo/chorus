"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";

export function ProjectCreateForm() {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setMessage("");

    const formData = new FormData(event.currentTarget);
    const payload = {
      name: String(formData.get("name") ?? ""),
      objective: String(formData.get("objective") ?? ""),
      expectedOutcome: String(formData.get("expectedOutcome") ?? ""),
      targetAmount: String(formData.get("targetAmount") ?? ""),
    };

    try {
      const response = await fetch("/api/projects", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const result = (await response.json()) as {
        id?: string;
        error?: string;
      };

      if (!response.ok || !result.id) {
        setMessage(result.error ?? "We couldn't create this project.");
        return;
      }

      router.push(`/projects/${result.id}`);
      router.refresh();
    } catch (error) {
      if (error instanceof Error) {
        setMessage(error.message || "The project service is unavailable.");
      } else {
        setMessage("The project service is unavailable.");
      }
    } finally {
      setBusy(false);
    }
  }

  return (
    <form className="project-form" onSubmit={submit}>
      <label>
        Project name
        <input name="name" placeholder="Campaign launch" required minLength={2} maxLength={80} />
      </label>
      <label>
        What are you setting out to do?
        <textarea
          name="objective"
          placeholder="Describe the goal and what success looks like."
          required
          minLength={10}
          maxLength={2000}
          rows={3}
        />
      </label>
      <div className="form-row">
        <div className="budget-field">
          <label htmlFor="targetAmount">Target budget</label>
          <div className="money-input">
            <span aria-hidden="true">$</span>
            <input
              id="targetAmount"
              name="targetAmount"
              type="number"
              min="0.01"
              max="999999999.99"
              step="0.01"
              placeholder="500.00"
              required
            />
            <span>USD</span>
          </div>
        </div>
        <label>
          Expected outcome <span className="optional">(optional)</span>
          <input
            name="expectedOutcome"
            placeholder="A campaign ready to publish"
            maxLength={1000}
          />
        </label>
      </div>
      {message && <p className="form-message" role="alert">{message}</p>}
      <div className="form-actions">
        <p>You&apos;ll be the project owner. Funding and payments are not enabled yet.</p>
        <button className="button button-primary" disabled={busy}>
          {busy ? "Creating..." : "Create project"}
        </button>
      </div>
    </form>
  );
}
