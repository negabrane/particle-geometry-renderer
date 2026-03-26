import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "export",
  basePath: "/particle-geometry-renderer",
  assetPrefix: "/particle-geometry-renderer/",
  typescript: {
    ignoreBuildErrors: true,
  },
  reactStrictMode: false,
};

export default nextConfig;
