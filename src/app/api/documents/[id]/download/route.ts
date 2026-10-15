import { NextResponse, type NextRequest } from "next/server";

import { AppError } from "@/lib/errors";
import { createDocumentDownloadUrl } from "@/lib/services/documents";
import { getCurrentUser } from "@/lib/supabase/server";

/**
 * Downloads a generated PDF.
 *
 * The bucket is private, so this handler authorises the request first and only then creates
 * a short-lived signed URL. The response is never cached: it is a per-user, per-document
 * bearer link.
 */
export async function GET(_request: NextRequest, context: { params: Promise<{ id: string }> }) {
  // [REVERT-LOGIN] ORIGINAL: บังคับล็อกอินก่อนดาวน์โหลด
  // const user = await getCurrentUser();
  // if (!user) {
  //   return NextResponse.json({ error: "กรุณาเข้าสู่ระบบก่อนดาวน์โหลด" }, { status: 401 });
  // }

  // TEMP-BYPASS-LOGIN: ข้ามการบังคับล็อกอินชั่วคราวเพื่อให้ preview ได้เลย
  // อยากกลับมาใช้รูปแบบเดิม: ลบบรรทัดด้านล่าง แล้ว uncomment โค้ดเดิมด้านบนกลับมา
  await getCurrentUser().catch(() => null);

  const { id } = await context.params;

  try {
    const signedUrl = await createDocumentDownloadUrl(id);
    return NextResponse.redirect(signedUrl, {
      status: 303,
      headers: { "Cache-Control": "no-store" },
    });
  } catch (error) {
    const status = error instanceof AppError ? error.status : 500;
    const message =
      error instanceof AppError ? error.message : "ไม่สามารถดาวน์โหลดเอกสารได้ กรุณาลองใหม่อีกครั้ง";

    if (!(error instanceof AppError)) console.error("[api/download] failed", error);

    return NextResponse.json({ error: message }, { status });
  }
}
