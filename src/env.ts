/**
 * Environment access.
 *
 * Two deliberate rules:
 *  1. NEXT_PUBLIC_* values are read with literal property access so that Next.js can
 *     inline them into the browser bundle. Dynamic lookups (process.env[name]) are not
 *     inlined and would be undefined in the browser.
 *  2. The Supabase secret key is only ever read by server code (src/lib/supabase/admin.ts).
 *     It must never be exposed through a NEXT_PUBLIC_* variable.
 */

export type PublicEnv = {
  supabaseUrl: string;
  supabasePublishableKey: string;
  appUrl: string;
};

export class MissingEnvError extends Error {
  constructor(names: string[]) {
    super(
      `ไม่พบตัวแปรสภาพแวดล้อมที่จำเป็น: ${names.join(", ")} — ` +
        `Required environment variables are missing: ${names.join(", ")}. ` +
        `Copy .env.example to .env.local and fill them in (see docs/operations.md).`,
    );
    this.name = "MissingEnvError";
  }
}

/** Browser-safe values, inlined at build time. */
export function publicEnv(): PublicEnv {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabasePublishableKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

  const missing: string[] = [];
  if (!supabaseUrl) missing.push("NEXT_PUBLIC_SUPABASE_URL");
  if (!supabasePublishableKey) missing.push("NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY");
  if (missing.length > 0) throw new MissingEnvError(missing);

  return {
    supabaseUrl: supabaseUrl as string,
    supabasePublishableKey: supabasePublishableKey as string,
    appUrl: process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000",
  };
}

/** Server-only values. Called lazily so a missing key fails at request time, not at import. */
export function serverEnv() {
  const secretKey = process.env.SUPABASE_SECRET_KEY;
  if (!secretKey) throw new MissingEnvError(["SUPABASE_SECRET_KEY"]);

  const timeout = Number.parseInt(process.env.PDF_BROWSER_TIMEOUT_MS ?? "", 10);

  return {
    secretKey,
    storageBucket: process.env.PDF_STORAGE_BUCKET ?? "generated-pdfs",
    organizationName: process.env.ORGANIZATION_NAME ?? "ฝ่ายเทคโนโลยีสารสนเทศ (IT Department)",
    fontPath: process.env.PDF_FONT_PATH,
    browserTimeoutMs: Number.isFinite(timeout) && timeout > 0 ? timeout : 45_000,
    executablePath: process.env.PDF_CHROMIUM_EXECUTABLE_PATH,
  };
}
