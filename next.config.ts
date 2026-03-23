import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: {
    serverComponentsExternalPackages: [],
  },

  webpack: (config) => {
    config.externals = [
      ...(config.externals || []),
      {
        "./content": "commonjs ./content",
      },
    ];
    return config;
  },
};

export default nextConfig;