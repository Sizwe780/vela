import Link from "next/link";
import type { ReactNode } from "react";
import { PublicFrame } from "./vela-landing";
export function InformationPage({
  title,
  intro,
  eyebrow,
  sections = [],
  children,
}: {
  title: string;
  intro: string;
  eyebrow: string;
  sections?: { id: string; title: string }[];
  children: ReactNode;
}) {
  return (
    <PublicFrame documentHeader={sections.length > 0}>
      <main id="main-content" className="information-page" tabIndex={-1}>
        <header className="information-hero">
          <span className="eyebrow">{eyebrow}</span>
          <h1>{title}</h1>
          <p>{intro}</p>
        </header>
        <div className={sections.length ? "information-layout" : ""}>
          {sections.length > 0 && (
            <aside className="information-index">
              <nav aria-label="On this page">
                <strong>On this page</strong>
                {sections.map((s) => (
                  <a key={s.id} href={`#${s.id}`}>
                    {s.title}
                  </a>
                ))}
                <Link href="/help">Need a hand? →</Link>
              </nav>
            </aside>
          )}
          <div className="information-body">{children}</div>
        </div>
      </main>
    </PublicFrame>
  );
}
