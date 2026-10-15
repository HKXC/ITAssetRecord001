import type { DocumentType } from "@/lib/database.types";
import { AppError } from "@/lib/errors";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";

/**
 * Reserves the next document number.
 *
 * The number comes from a Postgres sequence inside public.next_document_number(), so two
 * concurrent generations can never receive the same number and no application-level retry
 * is required.
 *
 *   individual document : ITA-{ASSET TYPE}-{YYMM}-{NNNN}   e.g. ITA-UPS-2610-0031
 *   register export     : REG-{YYMMDD}-{NNNN}              e.g. REG-261012-0032
 *
 * Only the service-role key may execute the function.
 */
export async function reserveDocumentNumber(
  documentType: DocumentType,
  assetId: string | null,
): Promise<string> {
  const admin = createAdminSupabaseClient();

  const { data, error } = await admin.rpc("next_document_number", {
    p_document_type: documentType,
    p_asset_id: assetId,
  });

  if (error) {
    console.error("[numbering]", error.code, error.message);
    throw new AppError("ไม่สามารถออกเลขที่เอกสารได้ กรุณาลองใหม่อีกครั้ง", "NUMBERING_FAILED", 500);
  }
  if (!data) {
    throw new AppError("ไม่สามารถออกเลขที่เอกสารได้ กรุณาลองใหม่อีกครั้ง", "NUMBERING_FAILED", 500);
  }

  return data;
}

/** Storage paths, kept immutable: a regeneration writes a new path, never an overwrite. */
export function assetDocumentPath(
  assetCode: string,
  documentNumber: string,
  revision: number,
): string {
  return `asset/${assetCode}/${documentNumber}-r${revision}.pdf`;
}

export function registerDocumentPath(
  documentNumber: string,
  revision: number,
  generatedAt: Date = new Date(),
): string {
  const year = generatedAt.getUTCFullYear();
  const month = String(generatedAt.getUTCMonth() + 1).padStart(2, "0");
  return `register/${year}-${month}/${documentNumber}-r${revision}.pdf`;
}
