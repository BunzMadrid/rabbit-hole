import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  serverExternalPackages: ["pino", "pino-pretty"],
  turbopack: {},
  webpack: (config, { isServer }) => {
    config.externals.push("pino-pretty", "lokijs", "encoding");
    
    config.resolve.fallback = {
      ...config.resolve.fallback,
      fs: false,
      net: false,
      tls: false,
    };
    
    config.resolve.alias = {
      ...config.resolve.alias,
      "@base-org/account": false,
      "@gemini-wallet/core": false,
      "@metamask/sdk": false,
      porto: false,
    };
    
    if (!isServer) {
      config.resolve.alias = {
        ...config.resolve.alias,
        "thread-stream": false,
        pino: false,
        "pino-pretty": false,
      };
    }

    return config;
  },
};

export default nextConfig;
