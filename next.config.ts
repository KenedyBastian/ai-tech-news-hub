import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  eslint: {
    // Linting is run separately in CI via `npm run lint`.
    ignoreDuringBuilds: false,
  },
};

export default nextConfig;
