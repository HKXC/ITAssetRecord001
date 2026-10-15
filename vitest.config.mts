import path from "node:path";
import { defineConfig } from "vitest/config";

/**
 * Unit tests are fast and DB-free. Integration tests (tests/integration) render real PDFs
 * with Chromium and are slower, so they can be excluded with:
 *   npx vitest run --exclude "tests/integration/**"
 */
export default defineConfig({
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "src"),
    },
  },
  test: {
    environment: "node",
    include: ["tests/**/*.test.ts"],
    testTimeout: 120_000,
    hookTimeout: 120_000,
    // Placeholder values so server-side modules can be imported without a real project.
    env: {
      NEXT_PUBLIC_SUPABASE_URL: "http://127.0.0.1:54321",
      NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: "test-publishable-key",
      SUPABASE_SECRET_KEY: "test-secret-key",
      NEXT_PUBLIC_APP_URL: "http://localhost:3000",
    },
  },
});
