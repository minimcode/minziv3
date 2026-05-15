import type { MetadataRoute } from "next";

/**
 * Web App Manifest. Next.js serves this at /manifest.webmanifest.
 *
 * Tailored for iOS "Add to Home Screen" — when the user opens the app
 * from the home-screen icon, Safari hides the browser chrome and Minzi
 * looks like a native app.
 */
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Minzi — Учите иероглифы",
    short_name: "Minzi",
    description:
      "Учите китайские иероглифы через письмо, понимание и осмысленные повторения.",
    start_url: "/",
    scope: "/",
    display: "standalone",
    orientation: "portrait",
    background_color: "#fff8f0",
    theme_color: "#c43a3a",
    lang: "ru",
    icons: [
      {
        src: "/icon-192.png",
        sizes: "192x192",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/icon-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/icon-192-maskable.png",
        sizes: "192x192",
        type: "image/png",
        purpose: "maskable",
      },
      {
        src: "/icon-512-maskable.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
    ],
    categories: ["education", "productivity"],
  };
}
