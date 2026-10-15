import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /**
   * Cache Components is the Next 16 model: caching is explicit. Every screen in this app is
   * per-request (session, filters, database reads), so nothing is cached and the
   * authenticated segment opts out of instant-navigation validation instead
   * (see src/app/(app)/layout.tsx).
   */
  cacheComponents: true,
  partialPrefetching: true,

  /** Produces .next/standalone for the Docker image. */
  output: "standalone",

  /**
   * Puppeteer and Chromium must not be bundled: they spawn a browser process and resolve
   * their own files at runtime.
   */
  serverExternalPackages: ["puppeteer"],

  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
