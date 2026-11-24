import { defineConfig } from "@neon/config/v1";

export default defineConfig({
  // Declare your Neon services here
  preview: {
    realtime: { allowedOrigins: ["http://localhost:3000", "http://127.0.0.1:3000", "http://localhost:3200", "http://127.0.0.1:3200"] },
  },
  auth: true,
  aiGateway: false, // Pending: the user chose to remain on Neon's Free plan.
  functions: {
    hello: { name: "LMS course catalog", source: "./hello.ts" },
  },
  // Branch policy: per-branch tuning
  branch: (branch) => {
    if (branch.isDefault) {
      // Default branch: no overrides, uses project defaults
      return {};
    }
    if (!branch.exists) {
      // New non-default branches: auto-expire
      // Run `neon checkout <name>` to create a new branch with these settings
      return { ttl: "7d" };
    }
    // Existing branch: no changes
    return {};
  },
});
