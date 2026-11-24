import Link from "next/link";
import type { ReactNode } from "react";
import { LearningFrame } from "./learning-frame";
import { PublicFrame } from "./vela-landing";
import styles from "./student-pages.module.css";
export function LearningShell({
  title,
  description,
  publicPage = false,
  children,
  breadcrumb = [],
}: {
  title: string;
  description?: string;
  publicPage?: boolean;
  children: ReactNode;
  breadcrumb?: { label: string; href: string }[];
}) {
  const content = (
    <main id="main-content" tabIndex={-1} className={`home-content ${styles.main}`}>
      <nav className={styles.breadcrumb} aria-label="Breadcrumb">
        <Link href="/">{publicPage ? "Vela" : "My learning"}</Link>
        {breadcrumb.map((b, i) => (
          <span key={i}>
            {" "}
            › <Link href={b.href}>{b.label}</Link>
          </span>
        ))}
        <span> › {title}</span>
      </nav>
      <header className={styles.pageIntro}>
        <h1>{title}</h1>
        {description && <p>{description}</p>}
      </header>
      {children}
    </main>
  );
  return publicPage ? (
    <PublicFrame>{content}</PublicFrame>
  ) : (
    <LearningFrame label={title}>{content}</LearningFrame>
  );
}
