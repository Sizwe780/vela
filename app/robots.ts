import type { MetadataRoute } from "next";
import { siteOrigin } from "../lib/site";
export default function robots(): MetadataRoute.Robots {
  const origin = siteOrigin();
  const local =
    new URL(origin).hostname === "localhost" || new URL(origin).hostname === "127.0.0.1";
  return {
    rules: {
      userAgent: "*",
      ...(local
        ? { disallow: "/" }
        : {
            allow: ["/", "/about"],
            disallow: [
              "/api/",
              "/auth/",
              "/study/",
              "/modules/",
              "/onboarding",
              "/profile",
              "/saved",
              "/review",
              "/search",
              "/staff",
              "/privacy",
              "/terms",
              "/email/",
              "/activity",
              "/practice/",
            ],
          }),
    },
    sitemap: origin + "/sitemap.xml",
  };
}
