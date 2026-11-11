export default function Loading() {
  return (
    <main className="system-page" id="main-content" aria-busy="true" aria-live="polite">
      <div className="system-card loading-card">
        <span className="loading-mark" aria-hidden="true" />
        <span className="section-kicker">CHORUS</span>
        <h1>Bringing your workspace together…</h1>
        <p>Loading the latest project records and activity.</p>
        <div className="loading-lines" aria-hidden="true"><i /><i /><i /></div>
      </div>
    </main>
  );
}
