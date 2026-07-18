import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Use webpack for compatibility with fabric.js and pdfjs-dist
  webpack: (config) => {
    // Externalize 'canvas' for SSR (node-canvas not needed)
    config.externals = [...(config.externals || []), { canvas: 'canvas' }];

    // Ensure .mjs files from pdfjs-dist are processed correctly
    config.module = config.module || {};
    config.module.rules = config.module.rules || [];
    config.module.rules.push({
      test: /\.mjs$/,
      include: /node_modules[\\/]pdfjs-dist/,
      type: 'javascript/auto',
      resolve: {
        fullySpecified: false,
      },
    });

    return config;
  },
  // Also provide turbopack config to avoid the error
  turbopack: {},
  // Disable strict mode for fabric.js compatibility
  reactStrictMode: false,
  // Allow large page data for PDF operations
  experimental: {
    largePageDataBytes: 512 * 1024,
  },
  allowedDevOrigins: ['192.168.223.129'],
};

export default nextConfig;
