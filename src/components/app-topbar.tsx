import Link from "next/link";

export function AppTopbar({
  breadcrumb,
  projectName,
}: {
  breadcrumb: string;
  projectName?: string;
}) {
  return (
    <header className="topbar">
      <div className="topbar-crumbs">
        <Link href="/overview">{breadcrumb}</Link>
        {projectName && (
          <>
            <span aria-hidden="true">/</span>
            <span className="topbar-current">{projectName}</span>
          </>
        )}
      </div>
      <div className="topbar-actions">
        <span className="topbar-status"><i /> Agent payments disabled</span>
        <span className="topbar-wallet"><span aria-hidden="true">◉</span> Wallet connects on demand</span>
      </div>
    </header>
  );
}
