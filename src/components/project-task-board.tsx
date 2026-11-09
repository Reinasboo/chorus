"use client";

import { useState, type FormEvent } from "react";
import { formatUsdFromMinorUnits } from "@/lib/money";

type ProjectTask = {
  id: string;
  title: string;
  description: string;
  category: string | null;
  estimatedCostMinor: string | null;
  status: string;
  reportedOutcome: string | null;
  createdByName: string;
  createdAt: string;
  updatedAt: string;
};

const taskStatuses = [
  { value: "todo", label: "To do" },
  { value: "in_progress", label: "In progress" },
  { value: "blocked", label: "Blocked" },
  { value: "completed", label: "Completed" },
];

export function ProjectTaskBoard({
  projectId,
  initialTasks,
  canManage,
  isActive,
}: {
  projectId: string;
  initialTasks: ProjectTask[];
  canManage: boolean;
  isActive: boolean;
}) {
  const [tasks, setTasks] = useState(initialTasks);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");

  async function createTask(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setMessage("");
    try {
      const response = await fetch(`/api/projects/${projectId}/tasks`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title, description }),
      });
      const result = (await response.json()) as {
        task?: ProjectTask;
        error?: string;
      };
      const newTask = result.task;
      if (!response.ok || !newTask) {
        setMessage(result.error ?? "Could not create the task.");
        return;
      }
      setTasks((current) => [newTask, ...current]);
      setTitle("");
      setDescription("");
      setMessage("Task created. No agent or external service was started.");
    } catch (error) {
      setMessage(
        error instanceof Error ? error.message : "The task service is unavailable.",
      );
    } finally {
      setBusy(false);
    }
  }

  async function saveTask(taskId: string, status: string, reportedOutcome: string) {
    setBusy(true);
    setMessage("");
    try {
      const response = await fetch(`/api/projects/${projectId}/tasks/${taskId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status, reportedOutcome }),
      });
      const result = (await response.json()) as {
        task?: {
          id: string;
          status: string;
          reportedOutcome: string | null;
          updatedAt: string;
          updatedByName: string;
        };
        error?: string;
      };
      const updatedTask = result.task;
      if (!response.ok || !updatedTask) {
        setMessage(result.error ?? "Could not update the task.");
        return;
      }
      setTasks((current) =>
        current.map((task) =>
          task.id === taskId
            ? {
                ...task,
                status: updatedTask.status,
                reportedOutcome: updatedTask.reportedOutcome,
                updatedAt: updatedTask.updatedAt,
                createdByName: task.createdByName,
              }
            : task,
        ),
      );
      setMessage("Task updated. Reported outcomes are not independently verified.");
    } catch (error) {
      setMessage(
        error instanceof Error ? error.message : "The task service is unavailable.",
      );
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="detail-card task-board" id="tasks">
      <div className="detail-card-heading">
        <p className="eyebrow">PROJECT TASKS · MANUAL TRACKING</p>
        <span className="section-count">{tasks.length}</span>
      </div>
      <h2>Work in progress</h2>
      <p className="task-board-intro">
        Tasks are created and updated by project members. No AI plan, agent
        execution, provider service, or payment is connected.
        {!isActive && " Task changes are disabled because this project is not active."}
      </p>

      {canManage && isActive && (
        <form className="task-create-form" onSubmit={createTask}>
          <h3>Add a task</h3>
          <label>
            Task title
            <input
              value={title}
              onChange={(event) => setTitle(event.currentTarget.value)}
              minLength={2}
              maxLength={120}
              required
              placeholder="Prepare the campaign outline"
            />
          </label>
          <label>
            Description
            <textarea
              value={description}
              onChange={(event) => setDescription(event.currentTarget.value)}
              minLength={10}
              maxLength={2000}
              rows={2}
              required
              placeholder="Describe the work and expected result."
            />
          </label>
          <button className="button button-secondary" disabled={busy}>
            {busy ? "Saving…" : "Add task"}
          </button>
        </form>
      )}

      {message && <p className="inline-message" role="status">{message}</p>}

      {tasks.length ? (
        <ul className="project-task-list">
          {tasks.map((task) => (
            <TaskCard
              key={task.id}
              task={task}
              disabled={busy || !isActive}
              onSave={saveTask}
            />
          ))}
        </ul>
      ) : (
        <div className="task-empty-state">
          <span className="empty-mark"><span>＋</span></span>
          <p>{canManage ? "No tasks yet. Add the first piece of work above." : "A project administrator can add tasks here."}</p>
        </div>
      )}
    </section>
  );
}

function TaskCard({
  task,
  disabled,
  onSave,
}: {
  task: ProjectTask;
  disabled: boolean;
  onSave: (id: string, status: string, outcome: string) => Promise<void>;
}) {
  const [status, setStatus] = useState(task.status);
  const [outcome, setOutcome] = useState(task.reportedOutcome ?? "");

  return (
    <li className="project-task-card">
      <div className="project-task-heading">
        <span className={`task-status task-status-${status}`}>{taskStatuses.find((item) => item.value === status)?.label ?? status}</span>
        <small>
          {task.category && `${task.category} · `}
          {task.estimatedCostMinor !== null &&
            `Draft estimate ${formatUsdFromMinorUnits(task.estimatedCostMinor)} · `}
          Added by {task.createdByName}
        </small>
      </div>
      <h3>{task.title}</h3>
      <p>{task.description}</p>
      <label className="task-outcome-field">
        Reported outcome <span>(not independently verified)</span>
        <textarea
          value={outcome}
          disabled={disabled}
          onChange={(event) => setOutcome(event.currentTarget.value)}
          maxLength={2000}
          rows={2}
          placeholder="Describe the result when work is complete."
        />
      </label>
      <div className="task-update-row">
        <label>
          <span className="visually-hidden">Status for {task.title}</span>
          <select disabled={disabled} value={status} onChange={(event) => setStatus(event.currentTarget.value)}>
            {taskStatuses.map((item) => <option value={item.value} key={item.value}>{item.label}</option>)}
          </select>
        </label>
        <button
          className="button button-secondary"
          type="button"
          disabled={disabled || (status === task.status && outcome === (task.reportedOutcome ?? ""))}
          onClick={() => void onSave(task.id, status, outcome)}
        >
          Save update
        </button>
      </div>
    </li>
  );
}
