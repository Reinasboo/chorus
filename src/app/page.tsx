import Link from "next/link";
import { ChorusMark } from "@/components/chorus-mark";

const features = [
  {
    title: "Projects with purpose",
    text: "Give every shared goal a clear objective, a team, and a visible path forward.",
    mark: "◇",
    className: "feature-large",
  },
  {
    title: "Accountable by design",
    text: "Separate self-reported contributions from quote-bound, provider-reported funding status.",
    mark: "◉",
    className: "",
  },
  {
    title: "Human-approved spending",
    text: "Set limits and require explicit review before any purchase can proceed.",
    mark: "↗",
    className: "",
  },
  {
    title: "Intelligence, with boundaries",
    text: "Turn intent into structured work. Keep model suggestions separate from approvals and execution.",
    mark: "✳",
    className: "feature-wide",
  },
];

export default function LandingPage() {
  return (
    <main className="landing-page" id="main-content">
      <header className="landing-nav">
        <Link className="brand-lockup" href="/">
          <span className="brand-icon"><ChorusMark className="brand-symbol" /></span>
          <span className="brand-wordmark">Chorus</span>
        </Link>
        <nav className="landing-links" aria-label="Main navigation">
          <a href="#product">Product</a>
          <a href="#how-it-works">How it works</a>
          <a href="#technology">Technology</a>
        </nav>
        <div className="landing-actions">
          <Link className="landing-signin" href="/sign-in">Sign in</Link>
          <Link className="button button-primary landing-cta" href="/sign-in">Get started <span aria-hidden="true">↗</span></Link>
        </div>
      </header>

      <section className="landing-hero">
        <div className="landing-hero-copy">
          <span className="announcement-pill"><i /> Shared projects, clearly accounted</span>
          <p className="hero-kicker">Many people. One purpose.</p>
          <h1>Shared goals.<br />Clearly accounted.</h1>
          <p className="hero-description">
            Bring the people, contribution reports, approvals, and work behind
            a shared goal into one auditable project.
          </p>
          <div className="hero-actions">
            <Link className="button button-primary" href="/sign-in">Create a project <span aria-hidden="true">↗</span></Link>
            <a className="button button-quiet" href="#how-it-works">See how Chorus works</a>
          </div>
          <div className="hero-footnote"><span className="status-dot" /> NEAR funding · wallet-confirmed · mainnet only</div>
        </div>

        <div className="hero-preview" aria-label="Illustrative preview of a Chorus project workspace">
          <div className="preview-window">
            <div className="preview-window-bar">
              <span className="preview-brand"><span className="brand-icon"><ChorusMark className="brand-symbol" /></span> Chorus</span>
              <span className="preview-status"><i /> Example workspace</span>
              <span className="preview-avatar">A</span>
            </div>
            <div className="preview-content">
              <div className="preview-sidebar">
                <span className="preview-nav-active">◫ <b>Overview</b></span>
                <span>◇ <b>Projects</b></span>
                <span>◉ <b>Treasury</b></span>
                <span>✳ <b>Intelligence</b></span>
              </div>
              <div className="preview-main">
                <span className="preview-overline">Illustrative data only</span>
                <h2>Community art campaign</h2>
                <p>A shared goal, with every decision visible.</p>
                <div className="preview-ledger" aria-label="Illustrative project activity">
                  <div className="preview-ledger-row">
                    <span className="ledger-marker ledger-marker-reported" aria-hidden="true" />
                    <span><b>Contribution report</b><small>Member reported · not verified</small></span>
                    <em>Unverified</em>
                  </div>
                  <div className="preview-ledger-row">
                    <span className="ledger-marker ledger-marker-review" aria-hidden="true" />
                    <span><b>Purchase request</b><small>Exact scope · awaiting a person</small></span>
                    <em>Review first</em>
                  </div>
                  <div className="preview-ledger-row">
                    <span className="ledger-marker ledger-marker-task" aria-hidden="true" />
                    <span><b>Campaign artwork</b><small>Task status · member updated</small></span>
                    <em>In progress</em>
                  </div>
                </div>
                <p className="preview-ledger-note">An approval records a decision. It does not move money.</p>
              </div>
            </div>
            <div className="preview-privacy"><span aria-hidden="true">◇</span> Example interface, with no live project or payment data</div>
          </div>
        </div>
      </section>

      <section className="landing-trust-row" aria-label="Chorus principles">
        <span>Projects with purpose</span><i />
        <span>Human review</span><i />
        <span>Clear funding status</span><i />
        <span>No hidden execution</span>
      </section>

      <section className="landing-section process-section" id="how-it-works">
        <div className="section-heading landing-section-heading">
          <div><span className="section-kicker">A clear path forward</span><h2>From shared intention<br />to accountable action.</h2></div>
          <p>Complex coordination should feel simple. Start with the outcome, then move one deliberate step at a time.</p>
        </div>
        <div className="process-grid">
          <article className="process-card"><span>01</span><i>⌘</i><h3>Bring people together</h3><p>Create a project, set the objective, and invite the people who share the purpose.</p><small>Projects, members, roles</small></article>
          <article className="process-card"><span>02</span><i>◉</i><h3>Make resources visible</h3><p>Track contribution reports separately from verified funds and make budget controls explicit.</p><small>Ledger, policy, activity</small></article>
          <article className="process-card"><span>03</span><i>↗</i><h3>Keep decisions human</h3><p>Review an exact purchase scope and approve it only when policy and verified funds allow.</p><small>Review, approval, execution</small></article>
        </div>
      </section>

      <section className="landing-section features-section" id="product">
        <div className="section-heading landing-section-heading">
          <div><span className="section-kicker">Purpose-built for teams</span><h2>Financial clarity.<br />Collaborative momentum.</h2></div>
          <p>A shared operating space that keeps the objective, the people, and the financial paper trail connected.</p>
        </div>
        <div className="feature-grid">
          {features.map((feature) => (
            <article className={`feature-card ${feature.className}`} key={feature.title}>
              <span className="feature-mark" aria-hidden="true">{feature.mark}</span>
              <h3>{feature.title}</h3>
              <p>{feature.text}</p>
              <span className="feature-line" />
            </article>
          ))}
        </div>
      </section>

      <section className="landing-section technology-section" id="technology">
        <div className="technology-copy">
          <span className="section-kicker">Built with open eyes</span>
          <h2>Infrastructure should earn trust.</h2>
          <p>Chorus supports a wallet-confirmed NEAR Intents funding flow for projects. It is mainnet-only, has not been end-to-end tested, and relies on quote-bound 1Click status rather than independent on-chain reconciliation. Agent service purchases are not implemented.</p>
          <Link className="text-link" href="/sign-in">Explore the prototype <span aria-hidden="true">→</span></Link>
        </div>
        <div className="technology-list">
          <div><span className="tech-mark">N</span><span><b>NEAR Protocol</b><small>Settlement design not validated</small></span><em>Not connected</em></div>
          <div><span className="tech-mark">↔</span><span><b>NEAR Intents</b><small>wNEAR → USDC project funding · mainnet only</small></span><em>Prototype</em></div>
          <div><span className="tech-mark">M</span><span><b>Machine Payments Protocol</b><small>No service payment flow configured</small></span><em>Not connected</em></div>
          <div><span className="tech-mark">✳</span><span><b>NEAR AI Cloud</b><small>Optional; no model configured</small></span><em>Optional</em></div>
        </div>
      </section>

      <section className="landing-final-cta">
        <div className="final-cta-glow" aria-hidden="true" />
        <span className="section-kicker">Start with the why</span>
        <h2>Great things happen<br />when people move together.</h2>
        <p>Give your next shared goal a clear place to begin.</p>
        <Link className="button button-primary" href="/sign-in">Create a project <span aria-hidden="true">↗</span></Link>
      </section>

      <footer className="landing-footer">
        <Link className="brand-lockup" href="/"><span className="brand-icon"><ChorusMark className="brand-symbol" /></span><span className="brand-wordmark">Chorus</span></Link>
        <span>Many people. One purpose. Intelligent execution.</span>
        <span className="footer-prototype"><i /> Prototype · mainnet funding not end-to-end tested</span>
      </footer>
    </main>
  );
}
