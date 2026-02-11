import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  reactCompiler: true,
  reactStrictMode: true,
  webpack: (config) => {
    config.externals = [...(config.externals || []), 'canvas'];
    return config;
  },
};

export default nextConfig;
