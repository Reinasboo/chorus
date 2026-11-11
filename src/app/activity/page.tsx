import { Suspense } from "react";
import { redirect } from "next/navigation";
import { ActivityLedger } from "@/components/activity-ledger";
import { AppSidebar } from "@/components/app-sidebar";
import { AppTopbar } from "@/components/app-topbar";
import { getCurrentSession } from "@/lib/auth-session";
import { getActivityLedgerForUser } from "@/lib/project-queries";

export default function ActivityPage() {
  return (
    <Suspense fallback={<div className="route-loading">Loading activity…</div>}>
      <ActivityContent />
    </Suspense>
  );
}

async function ActivityContent() {
  const session = await getCurrentSession();
  if (!session) redirect("/sign-in");

  const ledger = await getActivityLedgerForUser(session.user.id);
  return (
    <main className="app-shell" id="main-content">
      <AppSidebar
        userName={session.user.name}
        email={session.user.email}
        current="activity"
      />
      <section className="main-panel">
        <AppTopbar breadcrumb="Activity" />
        <div className="activity-page-content">
          <header className="activity-page-heading">
            <span className="section-kicker">TRANSPARENCY BY DEFAULT</span>
            <h1>Activity ledger</h1>
            <p>A chronological view of recorded changes across your projects.</p>
          </header>
          <ActivityLedger
            events={ledger.events}
            projects={ledger.projects}
            asOf={ledger.asOf}
          />
        </div>
      </section>
    </main>
  );
}
