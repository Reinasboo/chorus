import { Suspense } from "react";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { InviteControls } from "@/components/invite-controls";
import { AppSidebar } from "@/components/app-sidebar";
import { AppTopbar } from "@/components/app-topbar";
import { ProjectSectionNav } from "@/components/project-section-nav";
import { ProjectTaskBoard } from "@/components/project-task-board";
import { ProjectPlanningPanel } from "@/components/project-planning-panel";
import { ProjectEditForm } from "@/components/project-edit-form";
import { ContributionPanel } from "@/components/contribution-panel";
import { SpendingControls } from "@/components/spending-controls";
import { getCurrentSession } from "@/lib/auth-session";
import { isNearAiPlannerConfigured } from "@/lib/near-ai-planner";
import { canManageProject } from "@/lib/project-access";
import { formatUsdFromMinorUnits } from "@/lib/money";
import { usdInputFromMinorUnits } from "@/lib/money";
import {
  getProjectForMember,
  getContributionLedger,
  getProjectTasks,
  listProjectInvitations,
} from "@/lib/project-queries";

type PageProps = { params: Promise<{ projectId: string }> };

export default function ProjectPage({ params }: PageProps) {
  return (
    <Suspense fallback={<div className="route-loading">Opening project…</div>}>
      <ProjectContent params={params} />
    </Suspense>
  );
}

async function ProjectContent({ params }: PageProps) {
  const session = await getCurrentSession();
  if (!session) redirect("/sign-in");

  const { projectId } = await params;
  const project = await getProjectForMember(projectId, session.user.id);
  if (!project) notFound();
  const [contributionLedger, tasks] = await Promise.all([
    getContributionLedger(project.id),
    getProjectTasks(project.id),
  ]);
  const progressBasisPoints =
    (BigInt(contributionLedger.summary.verifiedAmountMinor) * BigInt(10_000)) /
    BigInt(project.targetAmountMinor);
  const budgetProgressPercent =
    Number(
      progressBasisPoints > BigInt(10_000)
        ? BigInt(10_000)
        : progressBasisPoints,
    ) / 100;
  const outstandingTaskCount = tasks.filter(
    (task) => task.status !== "completed",
  ).length;
  const invitations = canManageProject(project.role)
    ? await listProjectInvitations(project.id)
    : [];

  return (
    <main className="app-shell">
      <AppSidebar
        userName={session.user.name}
        email={session.user.email}
        current="projects"
        projectId={project.id}
      />

      <section className="main-panel">
        <AppTopbar breadcrumb="Projects" projectName={project.name} />
        <div className="project-detail-content">
          <Link className="back-link" href="/overview#projects">← All projects</Link>
          <section className="project-hero">
            <div className="project-hero-copy">
              <span className="project-symbol symbol-1">{project.name.slice(0, 1).toUpperCase()}</span>
              <div><p className="eyebrow">{project.status.toUpperCase()} PROJECT · {project.role.toUpperCase()}</p><h1>{project.name}</h1></div>
            </div>
            <span className="project-created">Started {new Date(project.createdAt).toLocaleDateString()}</span>
          </section>
          <ProjectSectionNav projectId={project.id} />

          <div className="detail-grid" id="treasury">
            <div className="detail-main">
              <section className="detail-card objective-card" id="overview">
                <div className="detail-card-heading"><p className="eyebrow">THE PURPOSE</p><span className="decorative-dot" /></div>
                <h2>What we&apos;re making happen</h2>
                <p>{project.objective}</p>
                {project.expectedOutcome && <div className="outcome-block"><span className="card-micro-label">WE&apos;LL KNOW WE&apos;RE DONE WHEN</span><p>{project.expectedOutcome}</p></div>}
                {canManageProject(project.role) && (
                  <ProjectEditForm
                    projectId={project.id}
                    role={project.role}
                    name={project.name}
                    objective={project.objective}
                    expectedOutcome={project.expectedOutcome}
                    targetAmount={usdInputFromMinorUnits(project.targetAmountMinor)}
                    status={project.status}
                  />
                )}
              </section>
              <ProjectTaskBoard
                key={tasks.map((task) => `${task.id}:${task.updatedAt}`).join("|")}
                projectId={project.id}
                initialTasks={tasks}
                canManage={canManageProject(project.role)}
                isActive={project.status === "active"}
              />
              <ContributionPanel
                projectId={project.id}
                summary={contributionLedger.summary}
                contributions={contributionLedger.contributions}
              />
              <SpendingControls
                projectId={project.id}
                canManage={canManageProject(project.role)}
              />
              <ProjectPlanningPanel
                projectId={project.id}
                canManage={canManageProject(project.role)}
                isActive={project.status === "active"}
                isConfigured={isNearAiPlannerConfigured()}
              />
              <section className="detail-card" id="activity">
                <div className="detail-card-heading"><p className="eyebrow">THE PAPER TRAIL</p><span className="section-count">{project.events.length} {project.events.length === 1 ? "event" : "events"}</span></div>
                <h2>Project activity</h2>
                {project.events.length ? (
                  <ol className="activity-list">
                    {project.events.map((event) => (
                      <li key={event.id}>
                        <span className="activity-marker" />
                        <div><strong>{event.action.replaceAll(".", " ")}</strong><p>{event.actorName ?? "System"} · {new Date(event.createdAt).toLocaleString()}</p></div>
                      </li>
                    ))}
                  </ol>
                ) : <p className="muted">Project changes will appear here.</p>}
              </section>
            </div>

            <aside className="detail-aside">
              <section className="budget-card">
                <p className="eyebrow">TARGET BUDGET</p>
                <strong>{formatUsdFromMinorUnits(project.targetAmountMinor)}</strong>
                <p>
                  Verified contributions{" "}
                  {formatUsdFromMinorUnits(
                    contributionLedger.summary.verifiedAmountMinor,
                  )}
                </p>
                <div
                  className="budget-progress"
                  role="img"
                  aria-label={`${budgetProgressPercent}% of target verified`}
                >
                  <span style={{ width: `${budgetProgressPercent}%` }} />
                </div>
                <div className="budget-legend">
                  <span>
                    Reported · unverified
                    <b>
                      {formatUsdFromMinorUnits(
                        contributionLedger.summary.reportedAmountMinor,
                      )}
                    </b>
                  </span>
                  <span>
                    Target
                    <b>{formatUsdFromMinorUnits(project.targetAmountMinor)}</b>
                  </span>
                </div>
                <div className="budget-position" aria-label="Budget position">
                  <div className="financial-row">
                    <span>Available · verified, unreserved</span>
                    <strong>
                      {formatUsdFromMinorUnits(
                        contributionLedger.summary.unreservedVerifiedAmountMinor,
                      )}
                    </strong>
                  </div>
                  <div className="financial-row">
                    <span>Committed · active approvals</span>
                    <strong>
                      {formatUsdFromMinorUnits(
                        contributionLedger.summary.reservedAmountMinor,
                      )}
                    </strong>
                  </div>
                  <div className="financial-row">
                    <span>Verified spending</span>
                    <strong className="value-unavailable">Unavailable</strong>
                  </div>
                  <div className="financial-row">
                    <span>Remaining after spending</span>
                    <strong className="value-unavailable">Unavailable</strong>
                  </div>
                  <div className="financial-row">
                    <span>Outstanding tasks</span>
                    <strong>{outstandingTaskCount}</strong>
                  </div>
                </div>
                <p>
                  Spending and payment evidence are unavailable because no
                  payment execution or settlement verifier is configured.
                  Approvals reserve funds but do not spend them.
                </p>
              </section>
              <section className="detail-card members-card" id="members">
                <div className="detail-card-heading"><p className="eyebrow">YOUR PEOPLE</p><span className="section-count">{project.members.length}</span></div>
                <h2>Members</h2>
                <ul className="member-list">
                  {project.members.map((member) => (
                    <li key={member.userId}>
                      <span className="avatar avatar-small">{member.name.slice(0, 1).toUpperCase()}</span>
                      <div className="member-copy"><strong>{member.name}</strong><small>{member.email}</small></div>
                      <span className="role-pill">{member.role}</span>
                    </li>
                  ))}
                </ul>
                {canManageProject(project.role) && (
                  <InviteControls
                    projectId={project.id}
                    initialInvitations={invitations}
                    actorRole={project.role}
                  />
                )}
              </section>
              <div className="safety-callout"><span className="safety-icon">i</span><p>Contribution entries are self-reported only. Payments and agent spending are disabled.</p></div>
            </aside>
          </div>
        </div>
      </section>
    </main>
  );
}
