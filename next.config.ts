
import type {NextConfig} from 'next';

const nextConfig: NextConfig = {
  /* config options here */
  typescript: {
    ignoreBuildErrors: true,
  },
  eslint: {
    ignoreDuringBuilds: true,
  },
  allowedDevOrigins: ["*.cloudworkstations.dev"],
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'placehold.co',
      },
    ],
  },
  webpack: (config, { isServer }) => {
    if (!isServer) {
      // Don't resolve server-only packages on the client
      config.resolve.fallback = {
        ...config.resolve.fallback,
        'node:async_hooks': false,
        'async_hooks': false,
        'handlebars': false,
        // These are Node.js modules, and should not be bundled for the client.
        'fs': false,
        'child_process': false,
        'net': false,
        'tls': false,
        // Genkit MCP and its dependencies are server-only
        'genkitx-mcp': false,
        'node-pty': false,
        // Genkit core tries to load this optional dependency.
        '@genkit-ai/firebase': false,
      };
    }
    return config;
  },
};

export default nextConfig;
