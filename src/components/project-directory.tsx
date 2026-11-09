"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { formatUsdFromMinorUnits } from "@/lib/money";

type ProjectItem = {
  id: string;
  name: string;
  objective: string;
  targetAmountMinor: string;
  status: string;
  role: string;
  createdAt: Date;
  isOwned: boolean;
  verifiedAmountMinor: string;
  reportedAmountMinor: string;
  memberCount: number;
};

export function ProjectDirectory({ projects }: { projects: ProjectItem[] }) {
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState("all");
  const [collection, setCollection] = useState("all");
  const filteredProjects = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    return projects.filter((project) => {
      const matchesQuery =
        !normalizedQuery ||
        project.name.toLowerCase().includes(normalizedQuery) ||
        project.objective.toLowerCase().includes(normalizedQuery);
      const matchesCollection =
        collection === "all" ||
        (collection === "mine" && project.isOwned) ||
        (collection === "shared" && !project.isOwned);
      return (
        matchesQuery &&
        matchesCollection &&
        (status === "all" || project.status === status)
      );
    });
  }, [projects, query, status, collection]);

  return (
    <section className="projects-section" id="projects">
      <div className="section-heading">
        <div>
          <span className="section-kicker">YOUR WORKSPACE</span>
          <h2>Projects</h2>
        </div>
        <span className="section-count">{filteredProjects.length} shown</span>
      </div>
      <div className="project-toolbar">
        <label className="search-field">
          <span aria-hidden="true">⌕</span>
          <input
            type="search"
            value={query}
            onChange={(event) => setQuery(event.currentTarget.value)}
            placeholder="Search projects"
            aria-label="Search projects"
          />
        </label>
        <label className="filter-field">
          <span className="visually-hidden">Filter by status</span>
          <select value={status} onChange={(event) => setStatus(event.currentTarget.value)}>
            <option value="all">All statuses</option>
            <option value="active">Active</option>
            <option value="completed">Completed</option>
            <option value="archived">Archived</option>
          </select>
        </label>
        <label className="filter-field">
          <span className="visually-hidden">Filter by project access</span>
          <select value={collection} onChange={(event) => setCollection(event.currentTarget.value)}>
            <option value="all">All projects</option>
            <option value="mine">Created by me</option>
            <option value="shared">Shared with me</option>
          </select>
        </label>
      </div>

      {filteredProjects.length ? (
        <div className="project-grid">
          {filteredProjects.map((project) => {
            const target = BigInt(project.targetAmountMinor);
            const verified = BigInt(project.verifiedAmountMinor);
            const progress =
              target > BigInt(0)
                ? Math.min(Number((verified * BigInt(10_000)) / target) / 100, 100)
                : 0;
            return (
              <Link className="project-card" href={`/projects/${project.id}`} key={project.id}>
                <div className="project-card-top">
                  <span className="project-symbol"><span>{project.name.slice(0, 1).toUpperCase()}</span></span>
                  <span className={`status-pill status-${project.status}`}>{project.status}</span>
                </div>
                <h3>{project.name}</h3>
                <p className="project-card-objective">{project.objective}</p>
                <div className="project-card-meta">
                  <span>{project.memberCount} {project.memberCount === 1 ? "member" : "members"}</span>
                  <span className="role-pill">{project.role}</span>
                </div>
                <div className="project-funding">
                  <div className="project-funding-label">
                    <span>Verified funding</span>
                    <span>{progress}%</span>
                  </div>
                  <div className="project-funding-track" role="img" aria-label={`${progress}% of target verified`}>
                    <span style={{ width: `${progress}%` }} />
                  </div>
                  <div className="project-card-bottom">
                    <span>
                      <strong>{formatUsdFromMinorUnits(project.verifiedAmountMinor)}</strong>
                      <small>verified</small>
                    </span>
                    <span>
                      <strong>{formatUsdFromMinorUnits(project.targetAmountMinor)}</strong>
                      <small>target</small>
                    </span>
                  </div>
                  {BigInt(project.reportedAmountMinor) > BigInt(0) && (
                    <small className="reported-note">
                      {formatUsdFromMinorUnits(project.reportedAmountMinor)} reported · unverified
                    </small>
                  )}
                </div>
                <span className="project-card-arrow" aria-hidden="true">↗</span>
              </Link>
            );
          })}
        </div>
      ) : (
        <div className="empty-state">
          <span className="empty-mark"><span>+</span></span>
          <h3>{projects.length ? "No projects match that search." : "Start with a shared purpose."}</h3>
          <p>
            {projects.length
              ? "Try another name or status filter."
              : "Create a project to bring people, plans, and transparent budgets together."}
          </p>
          {!projects.length && <a className="button button-primary" href="#new-project">Create a project</a>}
        </div>
      )}
    </section>
  );
}
