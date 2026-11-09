import Link from "next/link";
import { ChorusMark } from "@/components/chorus-mark";

const features = [
  {
    number: "01",
    title: "Projects with purpose",
    text: "Give every shared goal a clear objective, a team, and a visible path forward.",
    className: "feature-large",
  },
  {
    number: "02",
    title: "Accountable by design",
    text: "Separate self-reported contributions from independently verified settlement.",
    className: "",
  },
  {
    number: "03",
    title: "Human-approved spending",
    text: "Set limits and require explicit review before any purchase can proceed.",
    className: "",
  },
  {
    number: "04",
    title: "Intelligence, with boundaries",
    text: "Turn intent into structured work. Keep model suggestions separate from approvals and execution.",
    className: "feature-wide",
  },
];

export default function LandingPage() {
  return (
    <main className="landing-page">
      <header className="landing-nav">
        <Link className="brand-lockup" href="/">
          <span className="brand-icon"><ChorusMark className="brand-symbol" /></span>
          <span className="brand-wordmark">CHORUS</span>
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
        <div className="hero-grid-pattern" aria-hidden="true" />
        <div className="hero-glow" aria-hidden="true" />
        <div className="landing-hero-copy">
          <span className="announcement-pill"><i /> BUILT FOR SHARED AMBITION</span>
          <p className="hero-kicker">MANY PEOPLE. ONE PURPOSE.</p>
          <h1>Make good things<br /><span>happen together.</span></h1>
          <p className="hero-description">
            Bring people, plans, and transparent budgets into one place.
            Chorus helps teams move from a shared goal to accountable action.
          </p>
          <div className="hero-actions">
            <Link className="button button-primary" href="/sign-in">Start building <span aria-hidden="true">↗</span></Link>
            <a className="button button-quiet" href="#how-it-works"><span className="play-icon">↓</span> Explore how it works</a>
          </div>
          <div className="hero-footnote"><span className="status-dot" /> Payments are disabled in this prototype</div>
        </div>

        <div className="hero-preview" aria-label="Preview of a Chorus project workspace">
          <div className="preview-window">
            <div className="preview-window-bar">
              <span className="preview-brand"><span className="brand-icon"><ChorusMark className="brand-symbol" /></span> CHORUS</span>
              <span className="preview-status"><i /> PROJECT WORKSPACE</span>
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
                <span className="preview-overline">ACTIVE PROJECT · OWNER</span>
                <h2>Community campaign</h2>
                <p>Bring the neighborhood together around local art.</p>
                <div className="preview-stats">
                  <div><small>VERIFIED FUNDS</small><strong>$0.00</strong><em>Payments disabled</em></div>
                  <div><small>PROJECT TARGET</small><strong>$2,400</strong><em>USD budget</em></div>
                </div>
                <div className="preview-activity">
                  <div className="preview-activity-head"><b>Recent activity</b><span>View all</span></div>
                  <div className="preview-event"><i className="event-dot event-red" /><span><b>Project created</b><small>Owner · just now</small></span><em>Logged</em></div>
                  <div className="preview-event"><i className="event-dot event-green" /><span><b>Policy configured</b><small>Owner · project controls</small></span><em>Reviewable</em></div>
                </div>
              </div>
            </div>
            <div className="preview-privacy"><span>◇</span> Reports are not proof of settlement</div>
          </div>
          <div className="hero-float-card"><span className="float-icon">✓</span><span><b>Human control stays in the loop</b><small>Review scope before approvals</small></span></div>
        </div>
      </section>

      <section className="landing-trust-row" aria-label="Chorus principles">
        <span>BUILT AROUND PROJECTS</span><i />
        <span>HUMAN-APPROVED</span><i />
        <span>VERIFICATION FIRST</span><i />
        <span>NO HIDDEN EXECUTION</span>
      </section>

      <section className="landing-section process-section" id="how-it-works">
        <div className="section-heading landing-section-heading">
          <div><span className="section-kicker">A CLEAR PATH FORWARD</span><h2>From shared intention<br />to accountable action.</h2></div>
          <p>Complex coordination should feel simple. Start with the outcome, then move one deliberate step at a time.</p>
        </div>
        <div className="process-grid">
          <article className="process-card"><span>01</span><i>⌘</i><h3>Bring people together</h3><p>Create a project, set the objective, and invite the people who share the purpose.</p><small>PROJECTS · MEMBERS · ROLES</small></article>
          <article className="process-card"><span>02</span><i>◉</i><h3>Make resources visible</h3><p>Track contribution reports separately from verified funds and make budget controls explicit.</p><small>LEDGER · POLICY · AUDIT</small></article>
          <article className="process-card"><span>03</span><i>↗</i><h3>Keep decisions human</h3><p>Review an exact purchase scope and approve it only when policy and verified funds allow.</p><small>REVIEW · APPROVAL · EXECUTION</small></article>
        </div>
      </section>

      <section className="landing-section features-section" id="product">
        <div className="section-heading landing-section-heading">
          <div><span className="section-kicker">PURPOSE-BUILT FOR TEAMS</span><h2>Financial clarity.<br />Collaborative momentum.</h2></div>
          <p>A shared operating space that keeps the objective, the people, and the financial paper trail connected.</p>
        </div>
        <div className="feature-grid">
          {features.map((feature) => (
            <article className={`feature-card ${feature.className}`} key={feature.number}>
              <span className="feature-number">{feature.number}</span>
              <span className="feature-mark" aria-hidden="true">{feature.number === "03" ? "↗" : feature.number === "04" ? "✳" : feature.number === "02" ? "◉" : "◇"}</span>
              <h3>{feature.title}</h3>
              <p>{feature.text}</p>
              <span className="feature-line" />
            </article>
          ))}
        </div>
      </section>

      <section className="landing-section technology-section" id="technology">
        <div className="technology-copy">
          <span className="section-kicker">BUILT WITH OPEN EYES</span>
          <h2>Infrastructure should earn trust.</h2>
          <p>Chorus is exploring NEAR infrastructure for future payments. The current prototype does not connect a wallet, transfer assets, or verify chain settlement.</p>
          <Link className="text-link" href="/sign-in">Explore the prototype <span aria-hidden="true">→</span></Link>
        </div>
        <div className="technology-list">
          <div><span className="tech-mark">N</span><span><b>NEAR Protocol</b><small>Planned infrastructure</small></span><em>PLANNED</em></div>
          <div><span className="tech-mark">↔</span><span><b>NEAR Intents</b><small>Route validation required</small></span><em>PLANNED</em></div>
          <div><span className="tech-mark">M</span><span><b>Machine Payments Protocol</b><small>Payment flow not connected</small></span><em>PLANNED</em></div>
          <div><span className="tech-mark">✳</span><span><b>NEAR AI Cloud</b><small>No model provider configured</small></span><em>PLANNED</em></div>
        </div>
      </section>

      <section className="landing-final-cta">
        <div className="final-cta-glow" aria-hidden="true" />
        <span className="section-kicker">START WITH THE WHY</span>
        <h2>Great things happen<br />when people move together.</h2>
        <p>Give your next shared goal a clear place to begin.</p>
        <Link className="button button-primary" href="/sign-in">Create a project <span aria-hidden="true">↗</span></Link>
      </section>

      <footer className="landing-footer">
        <Link className="brand-lockup" href="/"><span className="brand-icon"><ChorusMark className="brand-symbol" /></span><span className="brand-wordmark">CHORUS</span></Link>
        <span>Many people. One purpose. Intelligent execution.</span>
        <span className="footer-prototype"><i /> Prototype · no live payments</span>
      </footer>
    </main>
  );
}
