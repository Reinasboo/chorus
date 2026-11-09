"use client";

import Link from "next/link";
import { useMemo, useState } from "react";

type ActivityEvent = {
  id: string;
  projectId: string;
  projectName: string;
  actorId: string | null;
  actorName: string | null;
  action: string;
  entityType: string;
  createdAt: string;
};

type ProjectOption = { id: string; name: string };

export function ActivityLedger({
  events,
  projects,
  asOf,
}: {
  events: ActivityEvent[];
  projects: ProjectOption[];
  asOf: number;
}) {
  const [projectId, setProjectId] = useState("all");
  const [eventType, setEventType] = useState("all");
  const [participantId, setParticipantId] = useState("all");
  const [dateRange, setDateRange] = useState("all");
  const [query, setQuery] = useState("");

  const eventTypes = useMemo(
    () => [...new Set(events.map((event) => event.entityType))].sort(),
    [events],
  );
  const participants = useMemo(() => {
    const byId = new Map<string, string>();
    for (const event of events) {
      const id = event.actorId ?? "system";
      byId.set(id, event.actorName ?? "System");
    }
    return [...byId.entries()].sort((a, b) => a[1].localeCompare(b[1]));
  }, [events]);
  const filteredEvents = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    const rangeDays = dateRange === "all" ? null : Number(dateRange);
    const cutoff = rangeDays === null ? null : asOf - rangeDays * 86_400_000;

    return events.filter((event) => {
      const matchesProject = projectId === "all" || event.projectId === projectId;
      const matchesType = eventType === "all" || event.entityType === eventType;
      const actorId = event.actorId ?? "system";
      const matchesParticipant =
        participantId === "all" || actorId === participantId;
      const matchesDate =
        cutoff === null || new Date(event.createdAt).getTime() >= cutoff;
      const searchable =
        `${event.action} ${event.projectName} ${event.actorName ?? "System"}`
          .toLowerCase();
      return (
        matchesProject &&
        matchesType &&
        matchesParticipant &&
        matchesDate &&
        (!normalizedQuery || searchable.includes(normalizedQuery))
      );
    });
  }, [asOf, dateRange, eventType, events, participantId, projectId, query]);

  function clearFilters() {
    setProjectId("all");
    setEventType("all");
    setParticipantId("all");
    setDateRange("all");
    setQuery("");
  }

  return (
    <section className="activity-ledger">
      <div className="activity-ledger-toolbar">
        <label className="search-field">
          <span aria-hidden="true">⌕</span>
          <input
            type="search"
            value={query}
            onChange={(event) => setQuery(event.currentTarget.value)}
            placeholder="Search events"
            aria-label="Search activity"
          />
        </label>
        <label className="filter-field">
          <span className="visually-hidden">Filter by project</span>
          <select value={projectId} onChange={(event) => setProjectId(event.currentTarget.value)}>
            <option value="all">All projects</option>
            {projects.map((project) => <option value={project.id} key={project.id}>{project.name}</option>)}
          </select>
        </label>
        <label className="filter-field">
          <span className="visually-hidden">Filter by event type</span>
          <select value={eventType} onChange={(event) => setEventType(event.currentTarget.value)}>
            <option value="all">All event types</option>
            {eventTypes.map((type) => <option value={type} key={type}>{type.replaceAll("_", " ")}</option>)}
          </select>
        </label>
        <label className="filter-field">
          <span className="visually-hidden">Filter by participant</span>
          <select value={participantId} onChange={(event) => setParticipantId(event.currentTarget.value)}>
            <option value="all">All participants</option>
            {participants.map(([id, name]) => <option value={id} key={id}>{name}</option>)}
          </select>
        </label>
        <label className="filter-field">
          <span className="visually-hidden">Filter by date</span>
          <select value={dateRange} onChange={(event) => setDateRange(event.currentTarget.value)}>
            <option value="all">Any time</option>
            <option value="7">Last 7 days</option>
            <option value="30">Last 30 days</option>
          </select>
        </label>
        <button className="activity-reset" type="button" onClick={clearFilters}>Clear</button>
      </div>

      <div className="activity-results-heading">
        <span className="section-kicker">PROJECT EVENT RECORDS</span>
        <span className="section-count">{filteredEvents.length} shown · up to 250 recent events</span>
      </div>

      {filteredEvents.length ? (
        <ol className="activity-ledger-list">
          {filteredEvents.map((event) => (
            <li key={event.id}>
              <span className="activity-ledger-marker" aria-hidden="true">{event.entityType.slice(0, 1).toUpperCase()}</span>
              <div className="activity-ledger-event">
                <strong>{event.action.replaceAll(".", " ")}</strong>
                <span>{event.entityType.replaceAll("_", " ")}</span>
              </div>
              <Link className="activity-ledger-project" href={`/projects/${event.projectId}`}>{event.projectName}</Link>
              <span className="activity-ledger-actor">{event.actorName ?? "System"}</span>
              <time dateTime={event.createdAt}>{new Date(event.createdAt).toLocaleString("en-US", { month: "short", day: "numeric", year: "numeric", hour: "numeric", minute: "2-digit" })}</time>
            </li>
          ))}
        </ol>
      ) : (
        <div className="empty-state activity-empty">
          <span className="empty-mark"><span>≋</span></span>
          <h2>{events.length ? "No events match these filters." : "Your project activity will appear here."}</h2>
          <p>
            {events.length
              ? "Try changing the project, event, participant, or date filters."
              : "Project and membership changes are recorded as they happen."}
          </p>
          {events.length > 0 && <button className="button button-secondary" type="button" onClick={clearFilters}>Clear filters</button>}
        </div>
      )}
      <p className="activity-ledger-disclaimer">
        These are application activity records. They are not blockchain transaction
        confirmations or proof of settlement.
      </p>
    </section>
  );
}
