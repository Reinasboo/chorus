import { Suspense } from "react";
import Link from "next/link";
import { redirect } from "next/navigation";
import { ChorusMark } from "@/components/chorus-mark";
import { AcceptInvitationButton } from "@/components/invite-controls";
import { getCurrentSession } from "@/lib/auth-session";

type PageProps = { params: Promise<{ token: string }> };
const TOKEN_PATTERN = /^[A-Za-z0-9_-]{43}$/;

export default function InvitePage({ params }: PageProps) {
  return (
    <Suspense fallback={<div className="route-loading">Opening invitation…</div>}>
      <InviteContent params={params} />
    </Suspense>
  );
}

async function InviteContent({ params }: PageProps) {
  const { token } = await params;
  if (!TOKEN_PATTERN.test(token)) redirect("/");

  const session = await getCurrentSession();
  if (!session) {
    redirect(`/sign-in?returnTo=${encodeURIComponent(`/invite/${token}`)}`);
  }

  return (
    <main className="invite-page" id="main-content">
      <Link className="brand-lockup" href="/"><span className="brand-icon"><ChorusMark className="brand-symbol" /></span><span className="brand-wordmark">Chorus</span></Link>
      <section className="invite-card">
        <p className="eyebrow">YOU&apos;RE INVITED</p>
        <h1>Make something happen together.</h1>
        <p>This invitation is private and can be used once. Accept to join the project as a contributor.</p>
        <AcceptInvitationButton token={token} />
      </section>
    </main>
  );
}
