import Link from "next/link";
import { ChorusMark } from "@/components/chorus-mark";

export default function NotFound() {
  return (
    <main className="system-page" id="main-content">
      <div className="system-card">
        <span className="brand-icon"><ChorusMark className="brand-symbol" /></span>
        <span className="section-kicker">404 · NOT FOUND</span>
        <h1>This page is out of the loop.</h1>
        <p>The link may have expired, moved, or belong to a project you cannot access.</p>
        <div className="system-actions">
          <Link className="button button-primary" href="/overview">Open workspace</Link>
          <Link className="button button-secondary" href="/">Go home</Link>
        </div>
      </div>
    </main>
  );
}
