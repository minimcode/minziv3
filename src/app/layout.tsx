import type { Metadata, Viewport } from "next";
import { Inter, Cormorant_Garamond, Ma_Shan_Zheng } from "next/font/google";
import { Providers } from "@/components/Providers";
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

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html
      lang="ru"
      className={`${inter.variable} ${cormorant.variable} ${maShanZheng.variable} h-full antialiased`}
    >
      <body className="min-h-full bg-rice">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
