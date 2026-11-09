"use client";

import Link from "next/link";
import { useState } from "react";
import { AccountControls } from "@/components/account-controls";
import { ChorusMark } from "@/components/chorus-mark";

type AppSidebarProps = {
  userName: string;
  email: string;
  current: "overview" | "projects" | "treasury" | "approvals" | "intelligence" | "activity" | "settings";
  projectId?: string;
};

function SidebarLink({
  href,
  active,
  label,
  icon,
  collapsed,
  onClick,
}: {
  href: string;
  active: boolean;
  label: string;
  icon: string;
  collapsed: boolean;
  onClick?: () => void;
}) {
  return (
    <Link
      className={`side-nav-link${active ? " is-active" : ""}`}
      href={href}
      aria-current={active ? "page" : undefined}
      title={collapsed ? label : undefined}
      onClick={onClick}
    >
      <span className="nav-glyph" aria-hidden="true">{icon}</span>
      <span className="nav-label">{label}</span>
    </Link>
  );
}

export function AppSidebar({
  userName,
  email,
  current,
  projectId,
}: AppSidebarProps) {
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const overviewHref = "/overview";
  const projectsHref = "/overview#projects";
  const treasuryHref = projectId
    ? `/projects/${projectId}#treasury`
    : "/overview#treasury";
  const approvalsHref = projectId
    ? `/projects/${projectId}#approvals`
    : "/overview#approvals";
  const intelligenceHref = projectId
    ? `/projects/${projectId}#intelligence`
    : "/overview#intelligence";
  const activityHref = projectId
    ? `/projects/${projectId}#activity`
    : "/activity";
  const closeMobile = () => setMobileOpen(false);

  return (
    <>
      <button
        className="mobile-menu-toggle"
        type="button"
        aria-label={mobileOpen ? "Close navigation" : "Open navigation"}
        aria-expanded={mobileOpen}
        onClick={() => setMobileOpen((open) => !open)}
      >
        <span aria-hidden="true">{mobileOpen ? "×" : "☰"}</span>
      </button>
      {mobileOpen && (
        <button
          className="sidebar-backdrop"
          type="button"
          aria-label="Close navigation"
          onClick={closeMobile}
        />
      )}
      <aside
        className={`sidebar${collapsed ? " is-collapsed" : ""}${mobileOpen ? " is-mobile-open" : ""}`}
        aria-label="Workspace navigation"
      >
        <div className="sidebar-brand-row">
          <Link className="brand-lockup" href={overviewHref} onClick={closeMobile}>
            <span className="brand-icon"><ChorusMark className="brand-symbol" /></span>
            <span className="brand-wordmark">CHORUS</span>
          </Link>
          <button
            className="sidebar-collapse"
            type="button"
            onClick={() => setCollapsed((value) => !value)}
            aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
            title={collapsed ? "Expand sidebar" : "Collapse sidebar"}
          >
            {collapsed ? "›" : "‹"}
          </button>
        </div>

        <div className="workspace-switcher">
          <span className="workspace-avatar">W</span>
          <span className="workspace-copy">
            <strong>Workspace</strong>
            <small>Personal workspace</small>
          </span>
          <span className="workspace-chevron" aria-hidden="true">⌄</span>
        </div>

        <nav className="side-nav" aria-label="Main navigation">
          <p className="nav-section-label">Workspace</p>
          <SidebarLink href={overviewHref} active={current === "overview"} label="Overview" icon="◫" collapsed={collapsed} onClick={closeMobile} />
          <SidebarLink href={projectsHref} active={current === "projects"} label="Projects" icon="◇" collapsed={collapsed} onClick={closeMobile} />
          <SidebarLink href={treasuryHref} active={current === "treasury"} label="Treasury" icon="◉" collapsed={collapsed} onClick={closeMobile} />
          <SidebarLink href={approvalsHref} active={current === "approvals"} label="Approvals" icon="✓" collapsed={collapsed} onClick={closeMobile} />
          <SidebarLink href={activityHref} active={current === "activity"} label="Activity" icon="≋" collapsed={collapsed} onClick={closeMobile} />
          <SidebarLink href={intelligenceHref} active={current === "intelligence"} label="Intelligence" icon="✳" collapsed={collapsed} onClick={closeMobile} />

          <p className="nav-section-label nav-section-spaced">Manage</p>
          <span className="side-nav-link is-disabled" title="Provider discovery is not configured">
            <span className="nav-glyph" aria-hidden="true">⌘</span>
            <span className="nav-label">Providers <small>Planned</small></span>
          </span>
          <span className="side-nav-link is-disabled" title="External integrations are not configured">
            <span className="nav-glyph" aria-hidden="true">⌁</span>
            <span className="nav-label">Integrations <small>Planned</small></span>
          </span>
          <SidebarLink href="/settings" active={current === "settings"} label="Settings" icon="⚙" collapsed={collapsed} onClick={closeMobile} />
        </nav>

        <div className="sidebar-bottom">
          <div className="sidebar-note">
            <span className="status-dot" />
            <span className="sidebar-note-copy">
              <strong>Payments are off</strong>
              <small>Safe setup mode</small>
            </span>
          </div>
          <div className="user-chip">
            <span className="avatar">{userName.slice(0, 1).toUpperCase()}</span>
            <span className="user-chip-copy">
              <strong>{userName}</strong>
              <small>{email}</small>
            </span>
            <AccountControls />
          </div>
        </div>
      </aside>
    </>
  );
}
