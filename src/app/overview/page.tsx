import { Suspense } from "react";
import Link from "next/link";
import { redirect } from "next/navigation";
import { AppSidebar } from "@/components/app-sidebar";
import { AppTopbar } from "@/components/app-topbar";
import { ProjectCreateForm } from "@/components/project-create-form";
import { ProjectDirectory } from "@/components/project-directory";
import { getCurrentSession } from "@/lib/auth-session";
import { formatUsdFromMinorUnits } from "@/lib/money";
import { getDashboardData } from "@/lib/project-queries";

export default function OverviewPage() {
  return (
    <Suspense fallback={<div className="route-loading">Opening your workspace…</div>}>
      <OverviewContent />
    </Suspense>
  );
}

async function OverviewContent() {
  const session = await getCurrentSession();
  if (!session) redirect("/sign-in");

  const dashboard = await getDashboardData(session.user.id);
  return (
    <main className="app-shell" id="main-content">
      <AppSidebar
        userName={session.user.name}
        email={session.user.email}
        current="overview"
      />
      <section className="main-panel">
        <AppTopbar breadcrumb="Workspace" />
        <div className="dashboard-content">
          <section className="welcome-row" id="overview">
            <div>
              <span className="section-kicker">YOUR WORKSPACE</span>
              <h1>Your projects,<br /><span>in good company.</span></h1>
              <p className="page-intro">Shared goals become real when everyone can see the plan.</p>
            </div>
            <Link className="button button-primary" href="#new-project"><span aria-hidden="true">＋</span> Create a project</Link>
          </section>

          <section className="stats-grid" aria-label="Workspace overview">
            <article className="stat-card stat-card-primary" id="treasury">
              <span className="stat-label">PROVIDER-REPORTED FUNDING</span>
              <strong>{formatUsdFromMinorUnits(dashboard.summary.verifiedAmountMinor)}</strong>
              <span className="stat-foot">Quote-bound status · not independently reconciled</span>
              <span className="stat-orbit" aria-hidden="true" />
            </article>
            <article className="stat-card">
              <span className="stat-label">ACTIVE PROJECTS</span>
              <strong>{dashboard.summary.activeProjects.toString().padStart(2, "0")}</strong>
              <span className="stat-foot">Of {dashboard.projects.length} total projects</span>
            </article>
            <article className="stat-card">
              <span className="stat-label">PENDING APPROVALS</span>
              <strong>{dashboard.summary.pendingApprovals.toString().padStart(2, "0")}</strong>
              <span className="stat-foot">Human review · no payment execution</span>
            </article>
          </section>

          <div className="dashboard-main-grid">
            <div className="dashboard-primary-column">
              <ProjectDirectory projects={dashboard.projects} />
              <section className="new-project-section" id="new-project">
                <div className="section-heading">
                  <div><span className="section-kicker">START WITH THE WHY</span><h2>Create a project</h2></div>
                  <span className="section-count">01 / NEW</span>
                </div>
                <div className="form-panel"><ProjectCreateForm /></div>
              </section>
            </div>

            <aside className="dashboard-rail">
              <section className="rail-card financial-rail">
                <div className="rail-card-header"><span className="rail-icon">◉</span><span className="section-kicker">TREASURY SNAPSHOT</span></div>
                <h2>Every dollar,<br />accounted for.</h2>
                <div className="financial-row">
                  <span>Provider-reported funds</span>
                  <strong>{formatUsdFromMinorUnits(dashboard.summary.verifiedAmountMinor)}</strong>
                </div>
                <div className="financial-row">
                  <span>Reports · unverified</span>
                  <strong>{formatUsdFromMinorUnits(dashboard.summary.reportedAmountMinor)}</strong>
                </div>
                <div className="financial-row">
                  <span>Reserved authorization</span>
                  <strong>{formatUsdFromMinorUnits(dashboard.summary.reservedAmountMinor)}</strong>
                </div>
                <div className="financial-row">
                  <span>Reported settled, unreserved</span>
                  <strong>{formatUsdFromMinorUnits(dashboard.summary.unreservedVerifiedAmountMinor)}</strong>
                </div>
                <div className="financial-row">
                  <span>Actual expenditure</span>
                  <strong className="value-unavailable">Not tracked</strong>
                </div>
                <div className="rail-disclaimer"><i /> Payment execution is disabled. Local records are not settlement evidence.</div>
              </section>

              <section className="rail-card approvals-rail" id="approvals">
                <div className="rail-card-header">
                  <span className="section-kicker">APPROVAL QUEUE</span>
                  <span className="section-count">{dashboard.summary.pendingApprovals}</span>
                </div>
                {dashboard.projects.some((project) => project.pendingApprovalCount > 0) ? (
                  <ul className="approval-project-list">
                    {dashboard.projects.filter((project) => project.pendingApprovalCount > 0).map((project) => (
                      <li key={project.id}>
                        <span><strong>{project.name}</strong><small>{project.pendingApprovalCount} awaiting review</small></span>
                        <Link href={`/projects/${project.id}#approvals`} aria-label={`Review approvals for ${project.name}`}>Review <span aria-hidden="true">↗</span></Link>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="empty-approvals">No purchase requests are awaiting review.</p>
                )}
                <p className="approvals-disclaimer">Review records authorize no payment or execution.</p>
              </section>

              <section className="rail-card intelligence-rail" id="intelligence">
                <div className="rail-card-header"><span className="rail-icon red-icon">✳</span><span className="section-kicker">CHORUS INTELLIGENCE</span></div>
                <h3>Planning, with a person in control.</h3>
                <p>No model provider is connected yet. Structured plan validation is ready; generated plans and provider recommendations are not available.</p>
                <span className="planned-label"><i /> PROVIDER NOT CONNECTED</span>
              </section>

              <section className="rail-card activity-rail" id="activity">
                <div className="rail-card-header"><span className="section-kicker">RECENT ACTIVITY</span><span className="section-count">{dashboard.activity.length}</span></div>
                {dashboard.activity.length ? (
                  <ol className="dashboard-activity-list">
                    {dashboard.activity.map((event) => (
                      <li key={event.id}>
                        <span className="dashboard-activity-marker" />
                        <div>
                          <Link href={`/projects/${event.projectId}`}>{event.action.replaceAll(".", " ")}</Link>
                          <small>{event.projectName} · {event.actorName ?? "System"}</small>
                          <time dateTime={event.createdAt}>{new Date(event.createdAt).toLocaleDateString("en-US", { month: "short", day: "numeric" })}</time>
                        </div>
                      </li>
                    ))}
                  </ol>
                ) : <p className="muted">Project events will appear here.</p>}
              </section>
            </aside>
          </div>

          <footer className="app-footer">NEAR project funding is mainnet-only and wallet-confirmed. Agent purchases are not enabled.</footer>
        </div>
      </section>
    </main>
  );
}
