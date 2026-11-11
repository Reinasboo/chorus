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
import { NearTreasurySettings } from "@/components/near-treasury-settings";
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
    <main className="app-shell" id="main-content">
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
          <ProjectSectionNav />

          <section className="project-pulse" aria-label="Project status at a glance">
            <div>
              <span>Verified funding</span>
              <strong>{formatUsdFromMinorUnits(contributionLedger.summary.verifiedAmountMinor)}</strong>
              <small>{budgetProgressPercent.toFixed(0)}% of target</small>
            </div>
            <div>
              <span>Work remaining</span>
              <strong>{outstandingTaskCount}</strong>
              <small>{outstandingTaskCount === 1 ? "open task" : "open tasks"}</small>
            </div>
            <div>
              <span>Committed</span>
              <strong>{formatUsdFromMinorUnits(contributionLedger.summary.reservedAmountMinor)}</strong>
              <small>approved, not spent</small>
            </div>
            <div>
              <span>People</span>
              <strong>{project.members.length}</strong>
              <small>{project.members.length === 1 ? "project member" : "project members"}</small>
            </div>
          </section>

          <section className="project-next-step" aria-label="Recommended next step">
            <span className="next-step-mark" aria-hidden="true">→</span>
            <div>
              <span className="section-kicker">RECOMMENDED NEXT STEP</span>
              <strong>
                {tasks.length === 0
                  ? "Turn the objective into a small, reviewable plan."
                  : outstandingTaskCount > 0
                    ? "Move the next task forward and record its outcome."
                    : "Review the project outcome and close the loop."}
              </strong>
              <p>
                {tasks.length === 0
                  ? "Add tasks manually or ask Chorus Intelligence for a draft if an AI provider is configured."
                  : outstandingTaskCount > 0
                    ? "Keep task status and outcomes current so everyone sees the same source of truth."
                    : "All recorded tasks are complete. Confirm the expected outcome before archiving the project."}
              </p>
            </div>
            <Link className="button button-secondary" href={tasks.length === 0 ? "#intelligence" : "#tasks"}>
              {tasks.length === 0 ? "Build the plan" : "Open tasks"}
            </Link>
          </section>

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
                nearTreasuryAccount={
                  project.nearTreasuryVerifiedAt
                    ? project.nearTreasuryAccount
                    : null
                }
                isActive={project.status === "active"}
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
              <NearTreasurySettings
                projectId={project.id}
                accountId={
                  project.nearTreasuryVerifiedAt
                    ? project.nearTreasuryAccount
                    : null
                }
                verifiedAt={project.nearTreasuryVerifiedAt?.toISOString() ?? null}
                canManage={canManageProject(project.role)}
              />
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
                  Agent purchases and independent settlement verification are
                  not configured. NEAR Intents funding status is reported by
                  1Click and is not independently reconciled. Approvals
                  reserve funds but do not spend them.
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
              <div className="safety-callout"><span className="safety-icon">i</span><p>Self-reported entries are not verified funds. NEAR Intents funding requires an explicit wallet confirmation; agent spending is not enabled.</p></div>
            </aside>
          </div>
        </div>
      </section>
    </main>
  );
}
