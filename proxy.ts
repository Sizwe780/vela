import { auth } from "./lib/auth/server";
import type { NextRequest } from "next/server";

// API handlers enforce their own session/admin-token policy and return JSON 401s.
const protect = auth.middleware({
  loginUrl: "/auth/sign-in",
  publicRoutes: [
    "/",
    "/study/demo",
    "/api",
    "/about",
    "/privacy",
    "/terms",
    "/robots.txt",
    "/sitemap.xml",
    "/manifest.webmanifest",
    "/opengraph-image",
    "/offline.html",
    "/sw.js",
    "/icon.svg",
  ],
});
export default async function proxy(request: NextRequest) {
  const response = await protect(request);
  const location = response.headers.get("location");
  if (location) {
    const target = new URL(location, request.url);
    if (target.origin === request.nextUrl.origin && target.pathname === "/auth/sign-in") {
      target.searchParams.set("redirectTo", request.nextUrl.pathname + request.nextUrl.search);
      response.headers.set("location", target.toString());
    }
  }
  return response;
}
export const config = {
  matcher: [
    "/study/:path*",
    "/modules/:path*",
    "/onboarding/:path*",
    "/profile/:path*",
    "/review/:path*",
    "/saved/:path*",
    "/search/:path*",
    "/staff/:path*",
    "/activity/:path*",
    "/practice/:path*",
    "/progress/:path*",
    "/learning-map/:path*",
    "/lounge/:path*",
    "/discussions/:path*",
    "/api/:path*",
  ],
};
