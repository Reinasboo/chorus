"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  formatUsdFromMinorUnits,
  parseUsdToMinorUnits,
} from "@/lib/money";

type ProposedTask = {
  title: string;
  description: string;
  category: string;
  estimatedCost: string;
};

type ProposedPlan = {
  summary: string;
  tasks: ProposedTask[];
};

export function ProjectPlanningPanel({
  projectId,
  canManage,
  isActive,
  isConfigured,
}: {
  projectId: string;
  canManage: boolean;
  isActive: boolean;
  isConfigured: boolean;
}) {
  const router = useRouter();
  const [plan, setPlan] = useState<ProposedPlan | null>(null);
  const [totalEstimatedMinor, setTotalEstimatedMinor] = useState("0");
  const [addedTasks, setAddedTasks] = useState<number[]>([]);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");

  async function generatePlan() {
    setBusy(true);
    setMessage("");
    setPlan(null);
    setAddedTasks([]);
    try {
      const response = await fetch(`/api/projects/${projectId}/plan`, {
        method: "POST",
      });
      const result = (await response.json()) as {
        plan?: ProposedPlan;
        totalEstimatedMinor?: string;
        error?: string;
      };
      if (!response.ok || !result.plan || !result.totalEstimatedMinor) {
        setMessage(result.error ?? "Could not generate a project plan.");
        return;
      }
      setPlan(result.plan);
      setTotalEstimatedMinor(result.totalEstimatedMinor);
    } catch (error) {
      setMessage(
        error instanceof Error ? error.message : "The planning service is unavailable.",
      );
    } finally {
      setBusy(false);
    }
  }

  async function addTask(task: ProposedTask, index: number) {
    setBusy(true);
    setMessage("");
    try {
      const response = await fetch(`/api/projects/${projectId}/tasks`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: task.title,
          description: task.description,
          category: task.category,
          estimatedCost: task.estimatedCost,
        }),
      });
      const result = (await response.json()) as { error?: string };
      if (!response.ok) {
        setMessage(result.error ?? "Could not add the task.");
        return;
      }
      setAddedTasks((current) => [...current, index]);
      setMessage("Task added. Its estimate is not a quote or spending authorization.");
      router.refresh();
    } catch (error) {
      setMessage(
        error instanceof Error ? error.message : "The task service is unavailable.",
      );
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="detail-card" id="intelligence">
      <p className="eyebrow">AI PLANNING</p>
      <h2>Turn the objective into a draft plan</h2>
      <p>
        The objective and budget are sent to NEAR AI Cloud when you generate a
        plan. Review the selected model&apos;s data-handling tier before use.
        Suggestions are not provider quotes, approvals, or verified services.
      </p>
      {!isConfigured && (
        <p className="muted">
          Planning is unavailable until a server-side NEAR AI API key and model
          are configured.
        </p>
      )}
      {!canManage && (
        <p className="muted">A project administrator can generate a plan.</p>
      )}
      {canManage && (
        <button
          className="button button-secondary"
          type="button"
          disabled={busy || !isActive || !isConfigured}
          onClick={() => void generatePlan()}
        >
          {busy ? "Working…" : "Generate draft plan"}
        </button>
      )}
      {!isActive && <p className="muted">Planning is disabled for inactive projects.</p>}

      {message && (
        <p className="inline-message" role="status" aria-live="polite" aria-atomic="true">
          {message}
        </p>
      )}
      {plan && (
        <div className="plan-proposal" aria-live="polite">
          <p>{plan.summary}</p>
          <p>
            Estimated total:{" "}
            <strong>{formatUsdFromMinorUnits(totalEstimatedMinor)}</strong>
          </p>
          <ul className="project-task-list">
            {plan.tasks.map((task, index) => {
              const estimateMinor = parseUsdToMinorUnits(task.estimatedCost);
              return (
                <li className="project-task-card" key={`${task.title}-${index}`}>
                  <div className="project-task-heading">
                    <span className="task-status">{task.category}</span>
                    <strong>
                      {estimateMinor === null
                        ? "Invalid estimate"
                        : formatUsdFromMinorUnits(estimateMinor)}
                    </strong>
                  </div>
                  <h3>{task.title}</h3>
                  <p>{task.description}</p>
                  {canManage && (
                    <button
                      className="button button-secondary"
                      type="button"
                      disabled={busy || addedTasks.includes(index) || !isActive}
                      onClick={() => void addTask(task, index)}
                    >
                      {addedTasks.includes(index) ? "Added to tasks" : "Add to project tasks"}
                    </button>
                  )}
                </li>
              );
            })}
          </ul>
        </div>
      )}
    </section>
  );
}
