import Link from "next/link";
import type { ReactNode } from "react";
import { Icon } from "./icons";
import { VelaBrand } from "./learning-frame";
import { ThemeToggle } from "./theme-toggle";

const features = [
  {
    title: "Read for understanding",
    icon: "book",
    text: "Work through short, illustrated study sessions. Try each example before revealing the solution, and keep personal notes alongside the lesson.",
  },
  {
    title: "Ask a better question",
    icon: "sparkle",
    text: "Ask the Academic Master about the lesson in front of you. Follow a citation to its source or request a hint for your next step.",
  },
  {
    title: "Practise what needs work",
    icon: "reset",
    text: "Recall ideas before checking the answer. Use your review queue and outcome evidence to decide what to revisit.",
  },
  {
    title: "Explore in the Practical Lab",
    icon: "arrow",
    text: "Check algebra one step at a time, transform a plane with a matrix, or watch a Riemann sum converge as you change the number of rectangles.",
  },
  {
    title: "Learn to teach the idea",
    icon: "check",
    text: "Where CAPS PCK is available, examine misconceptions and practise explaining a difficult idea to a learner.",
  },
  {
    title: "Connect the concepts",
    icon: "link",
    text: "Follow prerequisites across enrolled modules and use short concept checks to decide what to revisit.",
  },
] as const;

export function PublicFrame({
  children,
  documentHeader = false,
}: {
  children: ReactNode;
  documentHeader?: boolean;
}) {
  return (
    <div className="vela-landing">
      <header className="landing-nav">
        <VelaBrand />
        <nav aria-label="Public navigation">
          {documentHeader ? (
            <Link href="/">← Back to Vela</Link>
          ) : (
            <Link href="/#features">How it works</Link>
          )}
          <ThemeToggle />
          {!documentHeader && (
            <>
              <Link href="/auth/sign-in">Sign in</Link>
              <Link className="primary-button" href="/auth/sign-up">
                Get started
              </Link>
            </>
          )}
        </nav>
      </header>
      {children}
      <footer className="landing-footer">
        <VelaBrand />
        <nav aria-label="Vela information">
          <Link href="/about">About</Link>
          <Link href="/help">Help</Link>
          <Link href="/privacy">Privacy</Link>
          <Link href="/terms">Terms</Link>
        </nav>
      </footer>
    </div>
  );
}

export function VelaLanding() {
  return (
    <PublicFrame>
      <main id="main-content" tabIndex={-1}>
        <section className="landing-hero">
          <div className="landing-intro">
            <h1>Make the subject yours.</h1>
            <p>
              Study your course in focused sessions, work through difficult ideas with a
              source-backed tutor, and remember what you learn through active recall.
            </p>
            <div className="landing-actions">
              <Link className="primary-button" href="/auth/sign-up">
                Create an account <Icon name="arrow" size={15} />
              </Link>
              <Link className="landing-preview-link" href="/study/demo">
                Try a lesson
              </Link>
            </div>
          </div>
          <div className="landing-workspace" aria-label="Example Vela learning workspace">
            <div className="landing-workspace-bar">
              <Icon name="book" size={16} /> Calculus A <span>Limits and continuity</span>
            </div>
            <div className="landing-workspace-grid">
              <article>
                <span className="eyebrow">STUDY TEXT</span>
                <h2>What happens near the hole?</h2>
                <p>
                  Imagine walking towards a missing tile. You can predict where your next step would
                  land from the tiles around it.
                </p>
                <div
                  className="landing-formula"
                  aria-label="The limit as x approaches 2 of (x squared minus 4) divided by (x minus 2) equals 4."
                >
                  <span aria-hidden="true">
                    lim<sub>x → 2</sub>
                  </span>
                  <span className="landing-fraction" aria-hidden="true">
                    <span>x² − 4</span>
                    <span>x − 2</span>
                  </span>
                  <span aria-hidden="true">= 4</span>
                </div>
              </article>
              <article>
                <span className="eyebrow">ACADEMIC MASTER</span>
                <p className="landing-tutor">
                  <Icon name="sparkle" size={16} /> What value does the curve approach from each
                  side?
                </p>
                <Link href="/study/demo">
                  Explore the reader <Icon name="arrow" size={14} />
                </Link>
              </article>
            </div>
          </div>
        </section>
        <section
          id="features"
          className="landing-features"
          aria-labelledby="landing-features-heading"
        >
          <h2 id="landing-features-heading">A workspace for the way you learn</h2>
          <div>
            {features.map(({ title, icon, text }) => (
              <article key={title}>
                <Icon name={icon} />
                <h3>{title}</h3>
                <p>{text}</p>
              </article>
            ))}
          </div>
        </section>
        <section className="landing-cta">
          <div>
            <h2>Start with one lesson.</h2>
            <p>
              Explore the preview, then create an account to enroll in a published module and save
              your progress.
            </p>
          </div>
          <Link className="primary-button" href="/study/demo">
            Open the preview <Icon name="arrow" size={15} />
          </Link>
        </section>
      </main>
    </PublicFrame>
  );
}
