import type { NextConfig } from "next";
import { PHASE_DEVELOPMENT_SERVER } from "next/constants";
import { networkInterfaces } from "node:os";

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
};

/**
 * This machine's non-internal IPv4 addresses.
 *
 * Mobile device testing means opening the dev server from a phone on the same
 * network (`http://<lan-ip>:3000`). Next.js blocks cross-origin requests to
 * dev-only assets (`/_next/*`, HMR websocket) unless the origin is allowed, so
 * the LAN address has to be on the list. Detecting it beats hardcoding: the
 * address changes with the network, and a stale entry fails as a 403 on assets
 * rather than an obvious error.
 */
function localNetworkAddresses(): string[] {
  const addresses: string[] = [];
  for (const iface of Object.values(networkInterfaces())) {
    for (const net of iface ?? []) {
      // `family` is 'IPv4' on Node >= 18, 4 on older releases.
      const isIPv4 = net.family === 'IPv4' || (net.family as unknown as number) === 4;
      if (isIPv4 && !net.internal) {
        addresses.push(net.address);
      }
    }
  }
  return addresses;
}

/**
 * Extra dev origins, comma-separated — for a tunnel host (ngrok, Cloudflare) or
 * a device that reaches this machine under a name rather than an IP:
 *
 *   NEXT_DEV_ORIGINS="phone.local,*.trycloudflare.com" npm run dev
 *
 * Matching is exact or per-dot-segment wildcard, and it compares right to left:
 * `192.168.1.*` matches `192.168.1.57`, but `192.168.*` does not — use
 * `192.168.*.*`. Ports are ignored; only the hostname is checked.
 */
const extraDevOrigins = (process.env.NEXT_DEV_ORIGINS ?? '')
  .split(',')
  .map((origin) => origin.trim())
  .filter(Boolean);

export default function config(phase: string): NextConfig {
  // Dev-server phase only. `allowedDevOrigins` has no effect on a production
  // build, but scoping it by phase keeps the production config free of
  // development-only network settings and keeps LAN addresses out of it.
  if (phase === PHASE_DEVELOPMENT_SERVER) {
    return {
      ...nextConfig,
      allowedDevOrigins: [
        ...new Set([...localNetworkAddresses(), ...extraDevOrigins]),
      ],
    };
  }

  return nextConfig;
}
