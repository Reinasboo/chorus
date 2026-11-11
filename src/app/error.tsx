"use client";

import { useEffect } from "react";
import Link from "next/link";

export default function ErrorPage({
  error,
  retry,
}: {
  error: Error & { digest?: string };
  retry: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <main className="system-page" id="main-content">
      <div className="system-card">
        <span className="system-alert" aria-hidden="true">!</span>
        <span className="section-kicker">SOMETHING WENT WRONG</span>
        <h1>We couldn’t finish that request.</h1>
        <p>Your data has not been changed. Try again, or return to the workspace.</p>
        {error.digest && <small className="error-reference">Reference {error.digest}</small>}
        <div className="system-actions">
          <button className="button button-primary" type="button" onClick={() => retry()}>Try again</button>
          <Link className="button button-secondary" href="/overview">Open workspace</Link>
        </div>
      </div>
    </main>
  );
}
