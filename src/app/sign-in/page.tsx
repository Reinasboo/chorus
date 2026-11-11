import { Suspense } from "react";
import Link from "next/link";
import { ChorusMark } from "@/components/chorus-mark";
import { SignInForm } from "@/components/sign-in-form";

export default function SignInPage() {
  return (
    <main className="auth-layout" id="main-content">
      <section className="auth-story">
        <Link className="brand-lockup" href="/">
          <span className="brand-icon"><ChorusMark className="brand-symbol" /></span>
          <span className="brand-wordmark">Chorus</span>
        </Link>
        <div className="auth-story-copy">
          <p className="eyebrow">MANY PEOPLE. ONE PURPOSE.</p>
          <h1>Bring people together. Make things happen.</h1>
          <p>One shared place for your goals, contributors, plans, and the work ahead.</p>
        </div>
        <span className="auth-story-foot">Built for people who want to get things done.</span>
      </section>
      <section className="auth-panel">
        <div className="auth-panel-inner">
          <p className="eyebrow">YOUR NEXT THING STARTS HERE</p>
          <h2>Welcome to Chorus</h2>
          <p className="muted">Sign in or create an account to see your projects.</p>
          <Suspense fallback={<div className="loading-surface">Loading sign-in…</div>}>
            <SignInForm />
          </Suspense>
          <p className="auth-note">Local prototype: email verification is not configured.</p>
        </div>
      </section>
    </main>
  );
}
