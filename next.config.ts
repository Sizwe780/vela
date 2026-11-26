import type { NextConfig } from "next";

const config: NextConfig = {
  output: "standalone",
  // Keep a running dev server from sharing generated files with production builds.
  distDir:
    process.env.NODE_ENV === "development"
      ? process.env.VELA_UI_TEST_SERVER === "1"
        ? ".next-workspace-ux"
        : ".next-dev"
      : ".next",
  // Preserve precreated route directories in Windows workspace sandboxes.
  cleanDistDir: process.platform !== "win32",
  outputFileTracingIncludes: {
    "/api/quiz/submit": [
      "./generated/coach-cas/**/*",
      "./node_modules/nerdamer/**/*",
      "./node_modules/decimal.js/**/*",
      "./node_modules/mathlive/package.json",
      "./node_modules/mathlive/mathlive-ssr.min.mjs",
    ],
    "/api/generate": ["./.vela/specs/**/*"],
    "/api/staff/editorial": [
      "./.vela/specs/**/*",
      "./content/*/manifest.json",
      "./content/source-catalog.json",
    ],
    "/api/staff/workspace": ["./.vela/specs/**/*"],
    "/api/tutor": [
      "./.vela/specs/tutor-scaffolding-spec.md",
      "./.vela/specs/tutor-scaffolding-local-spec.md",
    ],
    "/api/tutor/diagnose": [
      "./generated/coach-cas/**/*",
      "./node_modules/nerdamer/**/*",
      "./node_modules/decimal.js/**/*",
      "./node_modules/mathlive/package.json",
      "./node_modules/mathlive/mathlive-ssr.min.mjs",
    ],
  },
  experimental: { serverActions: { bodySizeLimit: "2mb" } },
};
export default config;
