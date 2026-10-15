"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import type { DocumentActionState } from "@/app/(app)/assets/actions";
import { AppError } from "@/lib/errors";
import { regenerateDocument } from "@/lib/services/documents";
import { requireUser } from "@/lib/supabase/server";

/**
 * Regenerates a document as a new revision.
 *
 * For an individual document the asset is unchanged; for a register the stored
 * document_items set is reused, so a re-issued register always contains the same assets.
 */
export async function regenerateDocumentAction(
  _prevState: DocumentActionState,
  formData: FormData,
): Promise<DocumentActionState> {
  const user = await requireUser();
  const documentId = String(formData.get("document_id") ?? "");

  if (!documentId) return { status: "error", message: "ไม่พบรหัสอ้างอิงเอกสาร" };

  let newDocumentId: string;
  try {
    const document = await regenerateDocument(documentId, { userId: user.id });
    newDocumentId = document.documentId;
  } catch (error) {
    if (error instanceof AppError) return { status: "error", message: error.message };
    console.error("[documents] regenerate failed", error);
    return { status: "error", message: "สร้างเอกสารใหม่ไม่สำเร็จ กรุณาลองใหม่อีกครั้ง" };
  }

  revalidatePath("/documents");
  revalidatePath(`/documents/${documentId}`);
  redirect(`/documents/${newDocumentId}?generated=1`);
}
