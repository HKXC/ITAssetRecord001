import puppeteer, { type Browser } from "puppeteer";

import { serverEnv } from "@/env";
import { AppError } from "@/lib/errors";

/**
 * One shared Chromium instance per process.
 *
 * Launching a browser per document would dominate generation time, and Chromium is the
 * heaviest dependency in the image, so the instance is reused and relaunched only if it
 * died. `--no-sandbox` is required inside the container (no user namespace); the container
 * itself is the isolation boundary.
 */
let browserPromise: Promise<Browser> | null = null;

export async function getBrowser(): Promise<Browser> {
  if (browserPromise) {
    try {
      const existing = await browserPromise;
      if (existing.connected) return existing;
    } catch {
      // Fall through and launch again.
    }
    browserPromise = null;
  }

  const { executablePath } = serverEnv();

  browserPromise = puppeteer
    .launch({
      headless: true,
      executablePath: executablePath || undefined,
      args: [
        "--no-sandbox",
        "--disable-setuid-sandbox",
        "--disable-dev-shm-usage",
        "--font-render-hinting=none",
      ],
    })
    .catch((error: unknown) => {
      browserPromise = null;
      console.error("[pdf] failed to launch Chromium", error);
      throw new AppError(
        "ไม่สามารถเริ่มโปรแกรมสร้างเอกสาร PDF ได้ (Chromium) กรุณาติดต่อผู้ดูแลระบบ",
        "PDF_BROWSER_LAUNCH_FAILED",
        500,
      );
    });

  return browserPromise;
}

/** Registers a shutdown hook so the container exits cleanly. */
export function registerBrowserShutdown(): void {
  const close = () => {
    void closeBrowser();
  };
  process.once("SIGTERM", close);
  process.once("SIGINT", close);
}

export async function closeBrowser(): Promise<void> {
  const current = browserPromise;
  browserPromise = null;
  if (!current) return;
  try {
    const browser = await current;
    await browser.close();
  } catch {
    // Already gone.
  }
}
