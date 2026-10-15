import type { ReactNode } from "react";

// [REVERT-LOGIN] ORIGINAL IMPORT (คืนเมื่อกลับมาใช้ login):
// import { requireUser } from "@/lib/supabase/server";

/**
 * Authentication happens here once per request, and every page and action repeats the check
 * for itself (see the data-security note in docs/operations.md).
 *
 * `instant = false` opts this segment out of Cache Components' instant-navigation
 * validation. That is deliberate: every screen in this app reads request-scoped data
 * (session, filters, counts), so there is nothing here worth prerendering into a static
 * shell, and blocking on the server is simpler and always correct.
 *
 * ── TEMP-BYPASS-LOGIN (ยังไม่ต้องล็อกอิน — ปิดชั่วคราว) ──────────────────────
 * อยากกลับมาใช้รูปแบบเดิม: uncomment import requireUser ด้านบน และ uncomment
 * บรรทัด `await requireUser();` ในฟังก์ชันด้านล่างกลับมา
 * ────────────────────────────────────────────────────────────────────────────
 */
export const instant = false;

export default async function AppLayout({ children }: LayoutProps<"/">) {
  // [REVERT-LOGIN] ORIGINAL: บังคับล็อกอินทุกหน้าที่อยู่ในกลุ่ม (app)
  // await requireUser();

  // TEMP-BYPASS-LOGIN: ข้ามการบังคับล็อกอินชั่วคราวเพื่อให้ preview ได้เลย
  return children;
}
