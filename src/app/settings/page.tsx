import { Suspense } from "react";
import { redirect } from "next/navigation";
import { AccountControls } from "@/components/account-controls";
import { AppSidebar } from "@/components/app-sidebar";
import { AppTopbar } from "@/components/app-topbar";
import { getCurrentSession } from "@/lib/auth-session";

export default function SettingsPage() {
  return (
    <Suspense fallback={<div className="route-loading">Opening settings…</div>}>
      <SettingsContent />
    </Suspense>
  );
}

async function SettingsContent() {
  const session = await getCurrentSession();
  if (!session) redirect("/sign-in");

  return (
    <main className="app-shell">
      <AppSidebar
        userName={session.user.name}
        email={session.user.email}
        current="settings"
      />
      <section className="main-panel">
        <AppTopbar breadcrumb="Settings" />
        <div className="settings-content">
          <header className="settings-heading">
            <span className="section-kicker">ACCOUNT & WORKSPACE</span>
            <h1>Settings</h1>
            <p>Review your account and the integrations currently available.</p>
          </header>

          <section className="settings-card">
            <div className="settings-card-heading">
              <span className="settings-icon">◉</span>
              <div><h2>Account</h2><p>Your signed-in profile</p></div>
            </div>
            <dl className="settings-facts">
              <div><dt>Name</dt><dd>{session.user.name}</dd></div>
              <div><dt>Email</dt><dd>{session.user.email}</dd></div>
              <div>
                <dt>Email verification</dt>
                <dd>
                  <span className={`settings-status${session.user.emailVerified ? " status-verified" : ""}`}>
                    {session.user.emailVerified ? "Verified" : "Not verified"}
                  </span>
                </dd>
              </div>
            </dl>
            <p className="settings-note">Profile editing and email verification are not configured in this prototype.</p>
            <div className="settings-signout"><span>End your current session</span><AccountControls /></div>
          </section>

          <section className="settings-card">
            <div className="settings-card-heading">
              <span className="settings-icon">⌂</span>
              <div><h2>Workspace</h2><p>Personal workspace</p></div>
            </div>
            <p className="settings-body">
              Projects are scoped to your membership. Team workspaces, organization
              controls, and workspace invitations are not enabled.
            </p>
          </section>

          <section className="settings-card">
            <div className="settings-card-heading">
              <span className="settings-icon">⛓</span>
              <div><h2>Connections</h2><p>No external services are connected</p></div>
            </div>
            <ul className="connection-status-list">
              <li><span><b>Wallet</b><small>No wallet is connected</small></span><em>NOT CONNECTED</em></li>
              <li><span><b>AI provider</b><small>Plan generation is unavailable</small></span><em>NOT CONFIGURED</em></li>
              <li><span><b>Payment provider</b><small>Payment execution and settlement checks are unavailable</small></span><em>NOT CONFIGURED</em></li>
            </ul>
          </section>
          <p className="settings-footer">Chorus does not store wallet credentials or execute agent purchases. NEAR project funding requires each contributor to confirm a mainnet transaction in their wallet.</p>
        </div>
      </section>
    </main>
  );
}
