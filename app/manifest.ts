import type { MetadataRoute } from "next";
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Vela Learning",
    short_name: "Vela",
    description: "Your focused learning workspace",
    start_url: "/",
    display: "standalone",
    background_color: "#f6f8fb",
    theme_color: "#285849",
    icons: [{ src: "/icon.svg", sizes: "any", type: "image/svg+xml", purpose: "any" }],
  };
}
