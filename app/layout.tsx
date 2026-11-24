import { AcademicMasterDock } from "../components/learning/academic-master-dock";
import "./learning.css";
import { OfflineRegistration } from "../components/offline-registration";
import { WelcomeEmail } from "../components/welcome-email";
import { siteOrigin } from "../lib/site";
import type { ReactNode } from "react";
import "katex/dist/katex.min.css";
import "./tokens.css";
import "./globals.css";
import "./workspace.css";
import "./chemistry-lab.css";
import "./theme.css";
import "./activity/activity.css";
import "./mobile-tools.css";
import "./math-practice.css";
import "./coach.css";
import "./sandboxes.css";
import "./practice-notebook.css";
import "./social-learning.css";
import "./vela-design.css";
import "./vela-pages.css";
import { themeInitScript } from "../lib/theme";

export const metadata = {
  metadataBase: new URL(siteOrigin()),
  openGraph: {
    title: "Vela · Learn deeply. Teach confidently.",
    description: "A focused workspace for higher education and teacher training",
    images: ["/opengraph-image"],
  },
  title: "Vela · Your learning, in context",
  description: "A focused learning workspace for subject understanding and classroom practice.",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeInitScript }} />
      </head>
      <body>
        <a className="skip-link" href="#main-content">
          Skip to content
        </a>
        {children}
        <AcademicMasterDock />
        <OfflineRegistration />
        <WelcomeEmail />
      </body>
    </html>
  );
}
