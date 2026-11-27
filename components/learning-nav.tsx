"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect } from "react";
import { studentNavUpdate, useStudentResource } from "../lib/student/client";
import type { ModuleCapabilities } from "../lib/capabilities";
import styles from "./student-pages.module.css";

export function LearningNav({
  rail = false,
  onNavigate,
}: { rail?: boolean; onNavigate?: () => void } = {}) {
  const pathname = usePathname();
  const { data, reload } = useStudentResource<{
    capabilities: ModuleCapabilities;
    canModerate: boolean;
    classroomDue: number;
    institutions?: string[];
  }>("/api/capabilities");
  useEffect(() => {
    window.addEventListener(studentNavUpdate, reload);
    return () => window.removeEventListener(studentNavUpdate, reload);
  }, [reload]);
  const learning = [
    { href: "/", label: "Overview", symbol: "▦", enabled: rail },
    { href: "/review", label: "Review queue", symbol: "↻", enabled: true },
    {
      href: "/classroom",
      label: data?.classroomDue ? `Classroom (${data.classroomDue})` : "Classroom",
      symbol: "▤",
      enabled: true,
    },
    { href: "/progress", label: "Progress & outcomes", symbol: "◫", enabled: true },
    { href: "/learning-map", label: "Concept map", symbol: "◇", enabled: true },
    { href: "/lounge", label: "Study lounge", symbol: "◷", enabled: true },
    {
      href: "/practice/lab",
      label: "Practical Lab",
      symbol: "∑",
      enabled:
        data?.capabilities.math ||
        data?.capabilities.matrix ||
        data?.capabilities.calculus ||
        data?.capabilities.units ||
        data?.capabilities.molecules ||
        data?.capabilities.reactions,
    },
    { href: "/activity", label: "Study activity", symbol: "▥", enabled: true },
  ];
  const utilities = [
    { href: "/saved", label: "Saved library", symbol: "☆", enabled: true },
    { href: "/onboarding", label: "Manage modules", symbol: "+", enabled: rail },
    { href: "/staff", label: "Teaching workspace", symbol: "▤", enabled: data?.canModerate },
    {
      href: "/institution",
      label: "Institution",
      symbol: "▥",
      enabled: !!data?.institutions?.length,
    },
    { href: "/help", label: "Help and support", symbol: "?", enabled: true },
    {
      href: "/discussions/moderation",
      label: "Peer reports",
      symbol: "⚑",
      enabled: data?.canModerate,
    },
  ];

  function links(items: typeof learning) {
    return items
      .filter((item) => item.enabled)
      .map(({ href, label, symbol }) => (
        <Link
          key={href}
          href={href}
          onClick={onNavigate}
          aria-current={pathname === href ? "page" : undefined}
        >
          {rail && (
            <span className="rail-symbol" aria-hidden="true">
              {symbol}
            </span>
          )}
          {label}
        </Link>
      ));
  }

  return (
    <nav className={rail ? "vela-rail-nav" : styles.nav} aria-label="Learning navigation">
      {(
        [
          ["Learn", ["/", "/classroom", "/learning-map"]],
          ["Practice", ["/review", "/practice/lab", "/lounge"]],
          ["Insights", ["/progress", "/activity"]],
        ] as const
      ).map(([title, routes]) => (
        <div key={title} className="nav-section">
          <span className="nav-section-label">{title}</span>
          {links(learning.filter((item) => (routes as readonly string[]).includes(item.href)))}
        </div>
      ))}
      {rail && <span className="rail-divider" />}
      <button
        type="button"
        title="Learning briefing (Ctrl/Cmd + Shift + K)"
        onClick={() => {
          onNavigate?.();
          window.dispatchEvent(new CustomEvent("vela-open-master"));
        }}
      >
        {rail && (
          <span className="rail-symbol" aria-hidden="true">
            ✦
          </span>
        )}
        Academic Master briefing
      </button>
      {links(utilities)}
    </nav>
  );
}
