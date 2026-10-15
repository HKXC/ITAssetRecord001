import fs from "node:fs";
import path from "node:path";

import { serverEnv } from "@/env";
import { AppError } from "@/lib/errors";

/**
 * Loads the static Noto Sans Thai TTFs used to typeset documents.
 *
 * The fonts are bundled rather than left to the system, because the production image is a
 * slim Linux image without a Thai system font, and a silent fallback would change the
 * appearance of official documents. Missing files raise a clear error instead.
 *
 * Get the files with:  npm run fonts:fetch
 */
export type ThaiFonts = {
  regular: string;
  bold: string;
};

const ASSETS_DIR = path.join(process.cwd(), "src", "lib", "pdf", "assets");
const REGULAR_FILE = "NotoSansThai-Regular.ttf";
const BOLD_FILE = "NotoSansThai-Bold.ttf";

let cache: ThaiFonts | null = null;

function fileToDataUrl(filePath: string): string {
  const bytes = fs.readFileSync(filePath);
  return `data:font/ttf;base64,${bytes.toString("base64")}`;
}

export function loadThaiFonts(): ThaiFonts {
  if (cache) return cache;

  const override = serverEnv().fontPath;
  const regularPath = override ?? path.join(ASSETS_DIR, REGULAR_FILE);
  const boldPath = path.join(ASSETS_DIR, BOLD_FILE);

  if (!existsSync(regularPath)) {
    throw new AppError(
      `ไม่พบไฟล์ฟอนต์ไทยสำหรับสร้าง PDF: ${regularPath} — รันคำสั่ง "npm run fonts:fetch"`,
      "PDF_FONT_MISSING",
      500,
    );
  }

  cache = {
    regular: fileToDataUrl(regularPath),
    // A single-weight override falls back to the regular file for bold text.
    bold: existsSync(boldPath) ? fileToDataUrl(boldPath) : fileToDataUrl(regularPath),
  };

  return cache;
}

/** Test helper: clears the in-process font cache. */
export function resetThaiFontCache(): void {
  cache = null;
}

export function thaiFontPaths() {
  const override = serverEnv().fontPath;
  return {
    regular: override ?? path.join(ASSETS_DIR, REGULAR_FILE),
    bold: path.join(ASSETS_DIR, BOLD_FILE),
  };
}

// Guard implemented at runtime, not during static analysis, so the filesystem access is
// intentional and scoped to server code (route handlers, server actions, server components).
function existsSync(p: string): boolean {
  try {
    fs.accessSync(p, fs.constants.F_OK);
    return true;
  } catch {
    return false;
  }
}
