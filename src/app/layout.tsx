import type { Metadata, Viewport } from "next";
import { Inter, Cormorant_Garamond, Ma_Shan_Zheng } from "next/font/google";
import { Providers } from "@/components/Providers";
import { AppLoader } from "@/components/ui/AppLoader";
import "./globals.css";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin", "cyrillic"],
  display: "swap",
});

const cormorant = Cormorant_Garamond({
  variable: "--font-cormorant",
  subsets: ["latin", "cyrillic"],
  weight: ["400", "500", "600"],
  display: "swap",
});

const maShanZheng = Ma_Shan_Zheng({
  variable: "--font-brush",
  weight: "400",
  subsets: ["latin"],
  preload: false,
  display: "swap",
});

export const metadata: Metadata = {
  title: "Minzi — Учите иероглифы правильно",
  description:
    "Учите китайские иероглифы через письмо, понимание и осмысленные повторения. HSK-структура, реальный порядок черт, грамматика в контексте.",
  applicationName: "Minzi",
  appleWebApp: {
    capable: true,
    title: "Minzi",
    statusBarStyle: "default",
  },
  formatDetection: { telephone: false },
  icons: {
    icon: [
      { url: "/icon.svg", type: "image/svg+xml" },
      { url: "/icon-192.png", type: "image/png", sizes: "192x192" },
      { url: "/icon-512.png", type: "image/png", sizes: "512x512" },
    ],
    apple: [{ url: "/apple-icon.png", sizes: "180x180", type: "image/png" }],
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: "#c43a3a",
};

// Pre-hydration theme script. Runs synchronously before paint to set
// `html.theme-dark` based on the user's saved preference + system pref.
// This avoids a flash-of-light theme on first load. Kept minimal — the
// React-side <ThemeToggle> updates the same class.
const THEME_INIT_SCRIPT = `
(function() {
  try {
    var path = window.location.pathname;
    // The marketing landing at "/" is always served in the light palette,
    // regardless of the saved preference. Dark mode is scoped to the
    // signed-in product surface only.
    var isLanding = path === "/" || path === "";
    var saved = localStorage.getItem("minzi-theme");
    var prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
    var isDark = !isLanding && (saved === "dark" || ((saved === "system" || !saved) && prefersDark));
    var html = document.documentElement;
    if (isDark) html.classList.add("theme-dark");
    else html.classList.remove("theme-dark");
    // When in "system" mode, keep responding to OS changes (still respecting landing).
    if (saved === "system" || !saved) {
      var m = window.matchMedia("(prefers-color-scheme: dark)");
      var fn = function(e) {
        var cur = localStorage.getItem("minzi-theme");
        var stillLanding = window.location.pathname === "/" || window.location.pathname === "";
        if (cur === "system" || !cur) {
          html.classList.toggle("theme-dark", e.matches && !stillLanding);
        }
      };
      if (m.addEventListener) m.addEventListener("change", fn);
      else m.addListener(fn);
    }
  } catch (_) { /* localStorage blocked, no-op */ }
})();
`;

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html
      lang="ru"
      className={`${inter.variable} ${cormorant.variable} ${maShanZheng.variable} h-full antialiased`}
      suppressHydrationWarning
    >
      <head>
        <script
          // eslint-disable-next-line react/no-danger
          dangerouslySetInnerHTML={{ __html: THEME_INIT_SCRIPT }}
        />
      </head>
      <body className="min-h-full bg-rice">
        <AppLoader />
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
