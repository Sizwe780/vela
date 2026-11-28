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
import "./workspace-upgrade.css";
import "./site-refinement.css";
import "./learning-tools.css";
import "./science-tools.css";
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
  icons: {
    icon: [
      { url: "/vela-tab-v3.ico", sizes: "16x16 32x32 48x48", type: "image/x-icon" },
      { url: "/vela-tab-v3-32.png", sizes: "32x32", type: "image/png" },
    ],
    apple: [{ url: "/apple-touch-icon.png", sizes: "180x180", type: "image/png" }],
    other: [{ url: "/icon-192x192.png", sizes: "192x192", type: "image/png" }],
  },
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
