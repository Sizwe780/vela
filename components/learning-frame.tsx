import Link from "next/link";
import Image from "next/image";
import { velaLogoSrc } from "./vela-logo";
import type { ReactNode } from "react";
import { AccountMenu } from "./account-menu";
import { LearningNav } from "./learning-nav";
import { NavigationDrawer } from "./navigation-drawer";

export function VelaBrand() {
  return (
    <Link className="vela-brand" href="/" aria-label="Vela home">
      <Image
        src={velaLogoSrc}
        alt="Vela"
        width={32}
        height={32}
        className="vela-brand-logo"
        priority
      />
      <span>
        vela<span className="vela-brand-accent">.</span>
      </span>
    </Link>
  );
}

export function LearningFrame({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="learning-frame">
      <aside className="learning-rail">
        <VelaBrand />
        <span className="learning-rail-caption">Learning workspace</span>
        <LearningNav rail />
      </aside>
      <div className="learning-frame-body">
        <header className="learning-topbar">
          <div className="learning-topbar-context">
            <NavigationDrawer />
            <span aria-hidden="true">{label}</span>
          </div>
          <div className="learning-topbar-actions">
            <Link href="/search">Search</Link>
            <AccountMenu />
          </div>
        </header>
        {children}
      </div>
    </div>
  );
}
