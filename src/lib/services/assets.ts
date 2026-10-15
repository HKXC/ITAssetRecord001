import type { AssetStatus, AssetWithType, Json } from "@/lib/database.types";
import { AppError, NotFoundError, mapPostgresError } from "@/lib/errors";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import type { AssetFormInput, AssetSearchInput } from "@/lib/validation/asset";

const ASSET_SELECT = "*, asset_types(code, name)";
const thaiCollator = new Intl.Collator("th");

export type AssetListResult = {
  rows: AssetWithType[];
  total: number;
  page: number;
  perPage: number;
  pageCount: number;
};

/**
 * Escapes a term for a PostgREST `or=(...)` filter.
 *
 * `%` and `_` are LIKE wildcards and must be escaped, while `,`, `"`, `(` and `)` are
 * filter syntax and cannot be escaped reliably — they are replaced with spaces.
 */
export function escapeSearchTerm(term: string): string {
  return term
    .trim()
    .replace(/[",()]/g, " ")
    .replace(/[\\%_]/g, (match) => `\\${match}`);
}

function toAppError(
  error: { code?: string | null; message?: string | null },
  fallback: string,
): AppError {
  const mapped = mapPostgresError(error);
  if (mapped) return mapped;
  console.error("[assets]", error.code, error.message);
  return new AppError(fallback, "DATABASE_ERROR", 500);
}

export async function listAssets(params: AssetSearchInput): Promise<AssetListResult> {
  const supabase = await createServerSupabaseClient();

  const from = (params.page - 1) * params.per_page;
  const to = from + params.per_page - 1;

  let query = supabase.from("assets").select(ASSET_SELECT, { count: "exact" });

  if (params.q) {
    const term = escapeSearchTerm(params.q);
    if (term.length > 0) {
      query = query.or(
        [
          `asset_code.ilike.%${term}%`,
          `asset_name.ilike.%${term}%`,
          `serial_number.ilike.%${term}%`,
        ].join(","),
      );
    }
  }
  if (params.asset_type_id) query = query.eq("asset_type_id", params.asset_type_id);
  if (params.department) query = query.eq("department", params.department);
  if (params.location) query = query.eq("location", params.location);
  if (params.status) query = query.eq("status", params.status);

  const { data, error, count } = await query
    .order(params.sort, { ascending: params.dir === "asc", nullsFirst: false })
    .order("id", { ascending: true })
    .range(from, to);

  if (error) throw toAppError(error, "ไม่สามารถดึงรายการครุภัณฑ์ได้");

  const total = count ?? 0;
  return {
    rows: (data ?? []) as unknown as AssetWithType[],
    total,
    page: params.page,
    perPage: params.per_page,
    pageCount: Math.max(1, Math.ceil(total / params.per_page)),
  };
}

export async function getAssetById(id: string): Promise<AssetWithType> {
  const supabase = await createServerSupabaseClient();
  const { data, error } = await supabase.from("assets").select(ASSET_SELECT).eq("id", id).maybeSingle();

  if (error) throw toAppError(error, "ไม่สามารถดึงข้อมูลครุภัณฑ์ได้");
  if (!data) throw new NotFoundError("ไม่พบครุภัณฑ์ที่ระบุ", "ASSET_NOT_FOUND");

  return data as unknown as AssetWithType;
}

/** Loads many assets at once; the map preserves nothing about order, callers re-order. */
export async function getAssetsByIds(ids: string[]): Promise<Map<string, AssetWithType>> {
  if (ids.length === 0) return new Map();

  const supabase = await createServerSupabaseClient();
  const { data, error } = await supabase.from("assets").select(ASSET_SELECT).in("id", ids);

  if (error) throw toAppError(error, "ไม่สามารถดึงข้อมูลครุภัณฑ์ได้");

  const map = new Map<string, AssetWithType>();
  for (const row of (data ?? []) as unknown as AssetWithType[]) map.set(row.id, row);
  return map;
}

export async function createAsset(
  input: AssetFormInput,
  userId: string | null,
): Promise<AssetWithType> {
  const supabase = await createServerSupabaseClient();
  const { data, error } = await supabase
    .from("assets")
    .insert({ ...input, created_by: userId, updated_by: userId })
    .select(ASSET_SELECT)
    .single();

  if (error) throw toAppError(error, "ไม่สามารถบันทึกครุภัณฑ์ได้");
  return data as unknown as AssetWithType;
}

export async function updateAsset(
  id: string,
  input: AssetFormInput,
  userId: string | null,
): Promise<AssetWithType> {
  const supabase = await createServerSupabaseClient();
  const { data, error } = await supabase
    .from("assets")
    .update({ ...input, updated_by: userId })
    .eq("id", id)
    .select(ASSET_SELECT)
    .single();

  if (error) throw toAppError(error, "ไม่สามารถบันทึกครุภัณฑ์ได้");
  if (!data) throw new NotFoundError("ไม่พบครุภัณฑ์ที่ระบุ", "ASSET_NOT_FOUND");

  return data as unknown as AssetWithType;
}

/**
 * Distinct department and location values for the filter dropdowns.
 *
 * Values are free text, so they are collected from existing rows. The cap keeps the query
 * bounded; a department missing from the list can still be typed in the asset form.
 */
export async function getAssetFacets(limit = 5000): Promise<{
  departments: string[];
  locations: string[];
}> {
  const supabase = await createServerSupabaseClient();
  const { data, error } = await supabase
    .from("assets")
    .select("department, location")
    .limit(limit);

  if (error) throw toAppError(error, "ไม่สามารถดึงข้อมูลตัวกรองได้");

  const departments = new Set<string>();
  const locations = new Set<string>();

  for (const row of (data ?? []) as { department: string | null; location: string | null }[]) {
    if (row.department) departments.add(row.department);
    if (row.location) locations.add(row.location);
  }

  return {
    departments: [...departments].sort(thaiCollator.compare),
    locations: [...locations].sort(thaiCollator.compare),
  };
}

export type AssetStats = {
  total: number;
  documentsTotal: number;
  documentsFailed: number;
  byStatus: { status: AssetStatus; count: number }[];
  byType: { id: number; code: string; name: string; count: number }[];
};

function jsonRows(value: Json | undefined): Record<string, Json>[] {
  if (!Array.isArray(value)) return [];
  return value.filter(
    (row): row is Record<string, Json> => typeof row === "object" && row !== null && !Array.isArray(row),
  );
}

/** Dashboard statistics, computed in one round trip by public.asset_stats(). */
export async function getAssetStats(): Promise<AssetStats> {
  const supabase = await createServerSupabaseClient();
  const { data, error } = await supabase.rpc("asset_stats");

  if (error) throw toAppError(error, "ไม่สามารถดึงข้อมูลสรุปได้");

  const payload = (data ?? {}) as Record<string, Json>;

  return {
    total: Number(payload.total ?? 0),
    documentsTotal: Number(payload.documents_total ?? 0),
    documentsFailed: Number(payload.documents_failed ?? 0),
    byStatus: jsonRows(payload.by_status).map((row) => ({
      status: String(row.status ?? "active") as AssetStatus,
      count: Number(row.count ?? 0),
    })),
    byType: jsonRows(payload.by_type).map((row) => ({
      id: Number(row.id ?? 0),
      code: String(row.code ?? ""),
      name: String(row.name ?? ""),
      count: Number(row.count ?? 0),
    })),
  };
}
