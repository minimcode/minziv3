import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: {
    optimizePackageImports: ["lucide-react", "framer-motion"],
  },
  // Hanzi-writer ships ESM and works fine; nothing to alias.
};

export default nextConfig;
