import { AppError, mapPostgresError } from "@/lib/errors";
import type { AssetTypeRow } from "@/lib/database.types";
import { createServerSupabaseClient } from "@/lib/supabase/server";

/** All asset types, active first, in the order configured in Settings. */
export async function listAssetTypes(options: { includeInactive?: boolean } = {}): Promise<AssetTypeRow[]> {
  const supabase = await createServerSupabaseClient();

  let query = supabase
    .from("asset_types")
    .select("*")
    .order("sort_order", { ascending: true })
    .order("name", { ascending: true });

  if (!options.includeInactive) query = query.eq("is_active", true);

  const { data, error } = await query;
  if (error) throw toAppError(error, "ไม่สามารถดึงประเภทครุภัณฑ์ได้");

  return (data ?? []) as AssetTypeRow[];
}

export async function getAssetType(id: number): Promise<AssetTypeRow | null> {
  const supabase = await createServerSupabaseClient();
  const { data, error } = await supabase.from("asset_types").select("*").eq("id", id).maybeSingle();
  if (error) throw toAppError(error, "ไม่สามารถดึงประเภทครุภัณฑ์ได้");
  return (data as AssetTypeRow | null) ?? null;
}

export type AssetTypeInput = {
  code: string;
  name: string;
  sort_order: number;
  is_active: boolean;
};

export async function createAssetType(input: AssetTypeInput): Promise<AssetTypeRow> {
  const supabase = await createServerSupabaseClient();
  const { data, error } = await supabase.from("asset_types").insert(input).select("*").single();
  if (error) throw toAppError(error, "ไม่สามารถเพิ่มประเภทครุภัณฑ์ได้");
  return data as AssetTypeRow;
}

export async function updateAssetType(id: number, input: AssetTypeInput): Promise<AssetTypeRow> {
  const supabase = await createServerSupabaseClient();
  const { data, error } = await supabase
    .from("asset_types")
    .update(input)
    .eq("id", id)
    .select("*")
    .single();
  if (error) throw toAppError(error, "ไม่สามารถบันทึกประเภทครุภัณฑ์ได้");
  return data as AssetTypeRow;
}

/**
 * Asset types are referenced by assets with ON DELETE RESTRICT, so deactivating is the
 * supported way to retire one. Deleting is intentionally not implemented.
 */
export async function setAssetTypeActive(id: number, isActive: boolean): Promise<void> {
  const supabase = await createServerSupabaseClient();
  const { error } = await supabase.from("asset_types").update({ is_active: isActive }).eq("id", id);
  if (error) throw toAppError(error, "ไม่สามารถเปลี่ยนสถานะประเภทครุภัณฑ์ได้");
}

/** Counts how many assets use a type — used to explain why a type cannot be removed. */
export async function countAssetsOfType(id: number): Promise<number> {
  const supabase = await createServerSupabaseClient();
  const { count, error } = await supabase
    .from("assets")
    .select("id", { count: "exact", head: true })
    .eq("asset_type_id", id);
  if (error) throw toAppError(error, "ไม่สามารถนับจำนวนครุภัณฑ์ได้");
  return count ?? 0;
}

export { toAppError as assetTypeError };

function toAppError(error: { code?: string | null; message?: string | null }, fallback: string): AppError {
  const mapped = mapPostgresError(error);
  if (mapped) return mapped;
  console.error("[assetTypes]", error.code, error.message);
  return new AppError(fallback, "DATABASE_ERROR", 500);
}
