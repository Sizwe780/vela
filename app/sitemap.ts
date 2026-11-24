import type { MetadataRoute } from "next";
import { siteOrigin } from "../lib/site";
export default function sitemap(): MetadataRoute.Sitemap {
  return ["", "/about"].map((path) => ({
    url: siteOrigin() + path,
    changeFrequency: "weekly",
    priority: path ? 0.8 : 1,
  }));
}
