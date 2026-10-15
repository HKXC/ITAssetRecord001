import type { SupabaseClient } from "@supabase/supabase-js";

import { serverEnv } from "@/env";
import type {
  AssetWithType,
  Database,
  DocumentRow,
  DocumentType,
  DocumentWithAsset,
  GenerationStatus,
} from "@/lib/database.types";
import { AppError, NotFoundError } from "@/lib/errors";
import { renderHtmlToPdf } from "@/lib/pdf/render";
import { renderAssetDocumentHtml, renderRegisterDocumentHtml } from "@/lib/pdf/templates";
import {
  assetDocumentPath,
  registerDocumentPath,
  reserveDocumentNumber,
} from "@/lib/services/numbering";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";

type AdminClient = SupabaseClient<Database>;

const ASSET_SELECT = "*, asset_types(code, name)";

/** Guard rail: a single register export is capped so one request cannot exhaust Chromium. */
export const REGISTER_MAX_ASSETS = 500;
const DEFAULT_SIGNED_URL_TTL_SECONDS = 600;

export const DOCUMENT_TYPE_LABELS: Record<DocumentType, string> = {
  asset: "เอกสารรายเครื่อง",
  register: "ทะเบียนครุภัณฑ์รวม",
};

export const GENERATION_STATUS_LABELS: Record<GenerationStatus, string> = {
  pending: "รอดำเนินการ",
  generating: "กำลังสร้าง",
  ready: "พร้อมใช้งาน",
  failed: "ไม่สำเร็จ",
};

export type GeneratedDocument = {
  documentId: string;
  documentNumber: string;
  documentType: DocumentType;
  revision: number;
  storagePath: string;
  fileSizeBytes: number;
};

export type Actor = { userId: string | null };

// ---------------------------------------------------------------------------
// Reads used by the generation pipeline (admin client: no cookie, RLS bypassed)
// ---------------------------------------------------------------------------

async function loadAsset(admin: AdminClient, assetId: string): Promise<AssetWithType> {
  const { data, error } = await admin.from("assets").select(ASSET_SELECT).eq("id", assetId).maybeSingle();
  if (error) {
    console.error("[documents] load asset", error.code, error.message);
    throw new AppError("ไม่สามารถดึงข้อมูลครุภัณฑ์ได้", "ASSET_QUERY_FAILED", 500);
  }
  if (!data) throw new NotFoundError("ไม่พบครุภัณฑ์ที่ระบุ", "ASSET_NOT_FOUND");
  return data as unknown as AssetWithType;
}

/** Loads the selected assets and restores the caller's ordering. */
async function loadAssetsInOrder(admin: AdminClient, assetIds: string[]): Promise<AssetWithType[]> {
  const { data, error } = await admin.from("assets").select(ASSET_SELECT).in("id", assetIds);
  if (error) {
    console.error("[documents] load assets", error.code, error.message);
    throw new AppError("ไม่สามารถดึงรายการครุภัณฑ์ได้", "ASSET_QUERY_FAILED", 500);
  }

  const byId = new Map<string, AssetWithType>();
  for (const row of (data ?? []) as unknown as AssetWithType[]) byId.set(row.id, row);

  const missing = assetIds.filter((id) => !byId.has(id));
  if (missing.length > 0) {
    throw new AppError(
      `มีครุภัณฑ์ที่เลือกไว้ ${missing.length} รายการไม่พบในระบบแล้ว กรุณาโหลดหน้าใหม่และเลือกอีกครั้ง`,
      "ASSET_MISSING",
      409,
    );
  }

  return assetIds.map((id) => byId.get(id) as AssetWithType);
}

async function nextRevision(admin: AdminClient, documentNumber: string): Promise<number> {
  const { data, error } = await admin
    .from("documents")
    .select("revision")
    .eq("document_number", documentNumber)
    .order("revision", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) {
    console.error("[documents] revision lookup", error.code, error.message);
    throw new AppError("ไม่สามารถตรวจสอบเลขที่เอกสารได้", "DOCUMENT_QUERY_FAILED", 500);
  }

  return (data?.revision ?? 0) + 1;
}

async function createPendingDocument(
  admin: AdminClient,
  input: {
    documentNumber: string;
    documentType: DocumentType;
    assetId: string | null;
    revision: number;
    assetIds: string[] | null;
    userId: string | null;
  },
): Promise<string> {
  const { data, error } = await admin.rpc("create_document_with_items", {
    p_document_number: input.documentNumber,
    p_document_type: input.documentType,
    p_asset_id: input.assetId,
    p_revision: input.revision,
    p_created_by: input.userId,
    p_asset_ids: input.assetIds,
  });

  if (error || !data) {
    if (error) console.error("[documents] create row", error.code, error.message);
    throw new AppError("ไม่สามารถสร้างเอกสารได้ กรุณาลองใหม่อีกครั้ง", "DOCUMENT_CREATE_FAILED", 500);
  }

  return data;
}

async function markReady(
  admin: AdminClient,
  documentId: string,
  storagePath: string,
  fileSizeBytes: number,
): Promise<void> {
  const { error } = await admin
    .from("documents")
    .update({
      generation_status: "ready",
      storage_path: storagePath,
      file_size_bytes: fileSizeBytes,
      completed_at: new Date().toISOString(),
      error_message: null,
    })
    .eq("id", documentId);

  if (error) {
    console.error("[documents] mark ready", error.code, error.message);
    throw new AppError("ไม่สามารถบันทึกสถานะเอกสารได้", "DOCUMENT_UPDATE_FAILED", 500);
  }
}

/** Records the failure on the document row. Asset data is never touched. */
async function markFailed(admin: AdminClient, documentId: string, error: unknown): Promise<void> {
  const message = error instanceof Error ? error.message : String(error);

  const { error: updateError } = await admin
    .from("documents")
    .update({
      generation_status: "failed",
      error_message: message.slice(0, 500),
      completed_at: new Date().toISOString(),
    })
    .eq("id", documentId);

  if (updateError) console.error("[documents] mark failed", updateError.code, updateError.message);
}

async function uploadPdf(admin: AdminClient, storagePath: string, pdf: Buffer): Promise<void> {
  const { storageBucket } = serverEnv();

  const { error } = await admin.storage.from(storageBucket).upload(storagePath, pdf, {
    contentType: "application/pdf",
    // Never overwrite: a regeneration writes a new revision path instead.
    upsert: false,
    cacheControl: "no-store",
  });

  if (error) {
    console.error("[documents] upload", error.message);
    throw new AppError("อัปโหลดไฟล์เอกสารไม่สำเร็จ กรุณาลองใหม่อีกครั้ง", "STORAGE_UPLOAD_FAILED", 500);
  }
}

async function removeObject(admin: AdminClient, storagePath: string): Promise<void> {
  const { storageBucket } = serverEnv();
  const { error } = await admin.storage.from(storageBucket).remove([storagePath]);
  // Best effort only: an orphaned object is harmless and is reported by the
  // reconciliation query in docs/operations.md.
  if (error) console.error("[documents] cleanup failed", storagePath, error.message);
}

// ---------------------------------------------------------------------------
// Generation
// ---------------------------------------------------------------------------

/**
 * Generates the individual document for one asset.
 *
 * One asset has one document identity: regenerating keeps the document number and adds a
 * revision, so the history of the same document stays together and previous files remain
 * downloadable.
 */
export async function generateAssetDocument(
  assetId: string,
  actor: Actor,
): Promise<GeneratedDocument> {
  const admin = createAdminSupabaseClient();
  const asset = await loadAsset(admin, assetId);

  const { data: previous, error: previousError } = await admin
    .from("documents")
    .select("document_number")
    .eq("document_type", "asset")
    .eq("asset_id", assetId)
    .order("revision", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (previousError) {
    console.error("[documents] previous asset document", previousError.code, previousError.message);
    throw new AppError("ไม่สามารถตรวจสอบประวัติเอกสารได้", "DOCUMENT_QUERY_FAILED", 500);
  }

  const documentNumber =
    previous?.document_number ?? (await reserveDocumentNumber("asset", assetId));
  const revision = await nextRevision(admin, documentNumber);
  const storagePath = assetDocumentPath(asset.asset_code, documentNumber, revision);

  const documentId = await createPendingDocument(admin, {
    documentNumber,
    documentType: "asset",
    assetId,
    revision,
    assetIds: null,
    userId: actor.userId,
  });

  const generatedAt = new Date();

  try {
    const html = renderAssetDocumentHtml({
      asset,
      documentNumber,
      revision,
      generatedAt,
      organizationName: serverEnv().organizationName,
    });

    const pdf = await renderHtmlToPdf(html, { documentNumber });
    await uploadPdf(admin, storagePath, pdf);
    await markReady(admin, documentId, storagePath, pdf.byteLength);

    return {
      documentId,
      documentNumber,
      documentType: "asset",
      revision,
      storagePath,
      fileSizeBytes: pdf.byteLength,
    };
  } catch (error) {
    // If the upload succeeded but the status update failed, drop the orphaned object.
    await removeObject(admin, storagePath);
    await markFailed(admin, documentId, error);
    throw error;
  }
}

/**
 * Generates a consolidated register from an explicit selection.
 *
 * The exported rows are guaranteed to equal the selection: assets are re-read from the
 * database, the original order is restored, and the stored item set is checked against the
 * rendered row count before the document is marked ready.
 */
export async function generateRegisterDocument(
  assetIds: string[],
  actor: Actor,
  options: { documentNumber?: string; selectionNote?: string | null } = {},
): Promise<GeneratedDocument> {
  const uniqueIds = [...new Set(assetIds.filter(Boolean))];

  if (uniqueIds.length === 0) {
    throw new AppError("กรุณาเลือกรายการครุภัณฑ์อย่างน้อย 1 รายการ", "NO_SELECTION", 400);
  }
  if (uniqueIds.length > REGISTER_MAX_ASSETS) {
    throw new AppError(
      `เลือกได้ไม่เกิน ${REGISTER_MAX_ASSETS} รายการต่อหนึ่งเอกสาร (เลือกไว้ ${uniqueIds.length} รายการ)`,
      "TOO_MANY_ASSETS",
      400,
    );
  }

  const admin = createAdminSupabaseClient();
  const assets = await loadAssetsInOrder(admin, uniqueIds);

  const documentNumber = options.documentNumber ?? (await reserveDocumentNumber("register", null));
  const revision = await nextRevision(admin, documentNumber);
  const storagePath = registerDocumentPath(documentNumber, revision);

  const documentId = await createPendingDocument(admin, {
    documentNumber,
    documentType: "register",
    assetId: null,
    revision,
    assetIds: uniqueIds,
    userId: actor.userId,
  });

  const generatedAt = new Date();

  try {
    // Integrity check: the stored set must match the rendered set.
    const { count: storedItems, error: countError } = await admin
      .from("document_items")
      .select("asset_id", { count: "exact", head: true })
      .eq("document_id", documentId);

    if (countError) throw countError;
    if ((storedItems ?? 0) !== assets.length) {
      throw new AppError(
        "รายการที่บันทึกไว้ไม่ตรงกับที่เลือก กรุณาลองใหม่อีกครั้ง",
        "REGISTER_ITEM_MISMATCH",
        500,
      );
    }

    const html = renderRegisterDocumentHtml({
      assets,
      documentNumber,
      revision,
      generatedAt,
      organizationName: serverEnv().organizationName,
      selectionNote: options.selectionNote ?? null,
    });

    const pdf = await renderHtmlToPdf(html, { documentNumber, landscape: true });
    await uploadPdf(admin, storagePath, pdf);
    await markReady(admin, documentId, storagePath, pdf.byteLength);

    return {
      documentId,
      documentNumber,
      documentType: "register",
      revision,
      storagePath,
      fileSizeBytes: pdf.byteLength,
    };
  } catch (error) {
    await removeObject(admin, storagePath);
    await markFailed(admin, documentId, error);
    throw error;
  }
}

/**
 * Regenerates an existing document as a new revision.
 *
 * An individual document keeps its asset; a register keeps the stored item set, which is
 * why document_items exists — the PDF alone could not answer what it contained.
 */
export async function regenerateDocument(
  documentId: string,
  actor: Actor,
): Promise<GeneratedDocument> {
  const admin = createAdminSupabaseClient();

  const { data: document, error } = await admin
    .from("documents")
    .select("id, document_type, document_number, asset_id")
    .eq("id", documentId)
    .maybeSingle();

  if (error) {
    console.error("[documents] load document", error.code, error.message);
    throw new AppError("ไม่สามารถดึงข้อมูลเอกสารได้", "DOCUMENT_QUERY_FAILED", 500);
  }
  if (!document) throw new NotFoundError("ไม่พบเอกสารที่ระบุ", "DOCUMENT_NOT_FOUND");

  if (document.document_type === "asset") {
    if (!document.asset_id) {
      throw new AppError("เอกสารนี้ไม่มีครุภัณฑ์อ้างอิง", "DOCUMENT_WITHOUT_ASSET", 409);
    }
    return generateAssetDocument(document.asset_id, actor);
  }

  const { data: items, error: itemsError } = await admin
    .from("document_items")
    .select("asset_id, row_order")
    .eq("document_id", documentId)
    .order("row_order", { ascending: true });

  if (itemsError) {
    console.error("[documents] load items", itemsError.code, itemsError.message);
    throw new AppError("ไม่สามารถดึงรายการในเอกสารได้", "DOCUMENT_QUERY_FAILED", 500);
  }

  const assetIds = (items ?? []).map((item) => item.asset_id);
  if (assetIds.length === 0) {
    throw new AppError("เอกสารนี้ไม่มีรายการครุภัณฑ์ จึงสร้างใหม่ไม่ได้", "DOCUMENT_WITHOUT_ITEMS", 409);
  }

  return generateRegisterDocument(assetIds, actor, { documentNumber: document.document_number });
}

// ---------------------------------------------------------------------------
// Reads for the UI
// ---------------------------------------------------------------------------

export type DocumentListParams = {
  q: string | null;
  documentType: DocumentType | null;
  status: GenerationStatus | null;
  page: number;
  perPage: number;
};

export type DocumentListResult = {
  rows: DocumentWithAsset[];
  total: number;
  page: number;
  perPage: number;
  pageCount: number;
};

export async function listDocuments(params: DocumentListParams): Promise<DocumentListResult> {
  const admin = createAdminSupabaseClient();
  const from = (params.page - 1) * params.perPage;
  const to = from + params.perPage - 1;

  let query = admin
    .from("documents")
    .select("*, assets(id, asset_code, asset_name, asset_types(code, name))", { count: "exact" });

  if (params.q) {
    const term = params.q.trim().replace(/[",()]/g, " ");
    if (term.length > 0) query = query.ilike("document_number", `%${term}%`);
  }
  if (params.documentType) query = query.eq("document_type", params.documentType);
  if (params.status) query = query.eq("generation_status", params.status);

  const { data, error, count } = await query
    .order("created_at", { ascending: false })
    .order("revision", { ascending: false })
    .range(from, to);

  if (error) {
    console.error("[documents] list", error.code, error.message);
    throw new AppError("ไม่สามารถดึงรายการเอกสารได้", "DOCUMENT_QUERY_FAILED", 500);
  }

  const total = count ?? 0;
  return {
    rows: (data ?? []) as unknown as DocumentWithAsset[],
    total,
    page: params.page,
    perPage: params.perPage,
    pageCount: Math.max(1, Math.ceil(total / params.perPage)),
  };
}

export type DocumentDetail = {
  document: DocumentRow;
  asset: AssetWithType | null;
  assets: AssetWithType[];
  revisions: DocumentRow[];
};

export async function getDocumentDetail(documentId: string): Promise<DocumentDetail> {
  const admin = createAdminSupabaseClient();

  const { data: document, error } = await admin
    .from("documents")
    .select("*")
    .eq("id", documentId)
    .maybeSingle();

  if (error) {
    console.error("[documents] detail", error.code, error.message);
    throw new AppError("ไม่สามารถดึงข้อมูลเอกสารได้", "DOCUMENT_QUERY_FAILED", 500);
  }
  if (!document) throw new NotFoundError("ไม่พบเอกสารที่ระบุ", "DOCUMENT_NOT_FOUND");

  const { data: revisions, error: revisionsError } = await admin
    .from("documents")
    .select("*")
    .eq("document_number", document.document_number)
    .order("revision", { ascending: false });

  if (revisionsError) {
    console.error("[documents] revisions", revisionsError.code, revisionsError.message);
    throw new AppError("ไม่สามารถดึงประวัติเอกสารได้", "DOCUMENT_QUERY_FAILED", 500);
  }

  let asset: AssetWithType | null = null;
  let assets: AssetWithType[] = [];

  if (document.document_type === "asset" && document.asset_id) {
    asset = await loadAsset(admin, document.asset_id);
  }

  if (document.document_type === "register") {
    const { data: items } = await admin
      .from("document_items")
      .select("asset_id, row_order")
      .eq("document_id", document.id)
      .order("row_order", { ascending: true });

    const ids = (items ?? []).map((item) => item.asset_id);
    if (ids.length > 0) assets = await loadAssetsInOrder(admin, ids);
  }

  return {
    document,
    asset,
    assets,
    revisions: (revisions ?? []) as DocumentRow[],
  };
}

/** Documents of one asset, newest first — used on the asset detail page. */
export async function listAssetDocuments(assetId: string): Promise<DocumentRow[]> {
  const admin = createAdminSupabaseClient();
  const { data, error } = await admin
    .from("documents")
    .select("*")
    .eq("asset_id", assetId)
    .order("revision", { ascending: false });

  if (error) {
    console.error("[documents] asset documents", error.code, error.message);
    throw new AppError("ไม่สามารถดึงเอกสารของครุภัณฑ์ได้", "DOCUMENT_QUERY_FAILED", 500);
  }

  return (data ?? []) as DocumentRow[];
}

/**
 * Creates a short-lived signed URL for a private object.
 *
 * The caller has already been authenticated; the URL itself is a bearer link, so its
 * lifetime is deliberately short.
 */
export async function createDocumentDownloadUrl(
  documentId: string,
  expiresInSeconds: number = DEFAULT_SIGNED_URL_TTL_SECONDS,
): Promise<string> {
  const admin = createAdminSupabaseClient();

  const { data: document, error } = await admin
    .from("documents")
    .select("storage_path, generation_status")
    .eq("id", documentId)
    .maybeSingle();

  if (error) {
    console.error("[documents] download lookup", error.code, error.message);
    throw new AppError("ไม่สามารถดึงข้อมูลเอกสารได้", "DOCUMENT_QUERY_FAILED", 500);
  }
  if (!document) throw new NotFoundError("ไม่พบเอกสารที่ระบุ", "DOCUMENT_NOT_FOUND");
  if (document.generation_status !== "ready" || !document.storage_path) {
    throw new AppError("เอกสารนี้ยังไม่พร้อมดาวน์โหลด", "DOCUMENT_NOT_READY", 409);
  }

  const { storageBucket } = serverEnv();
  const { data, error: signError } = await admin.storage
    .from(storageBucket)
    .createSignedUrl(document.storage_path, expiresInSeconds, { download: true });

  if (signError || !data?.signedUrl) {
    console.error("[documents] sign", signError?.message);
    throw new AppError("ไม่สามารถสร้างลิงก์ดาวน์โหลดได้ กรุณาลองใหม่อีกครั้ง", "STORAGE_SIGN_FAILED", 500);
  }

  return data.signedUrl;
}
