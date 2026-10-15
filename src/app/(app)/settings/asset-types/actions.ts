"use server";

import { revalidatePath } from "next/cache";

import { AppError } from "@/lib/errors";
import {
  countAssetsOfType,
  createAssetType,
  setAssetTypeActive,
  updateAssetType,
} from "@/lib/services/assetTypes";
import { requireUser } from "@/lib/supabase/server";
import { parseAssetTypeForm } from "@/lib/validation/assetType";

export type AssetTypeFormState = {
  status: "idle" | "error" | "success";
  message: string | null;
  errors: Record<string, string>;
};

function toState(error: unknown, fallback: string): AssetTypeFormState {
  if (error instanceof AppError) {
    return {
      status: "error",
      message: error.message,
      errors: error.field ? { [error.field]: error.message } : {},
    };
  }
  console.error("[asset-types] unexpected error", error);
  return { status: "error", message: fallback, errors: {} };
}

export async function createAssetTypeAction(
  _prevState: AssetTypeFormState,
  formData: FormData,
): Promise<AssetTypeFormState> {
  await requireUser();

  const parsed = parseAssetTypeForm(formData);
  if (!parsed.ok) {
    return { status: "error", message: "กรุณาตรวจสอบข้อมูลที่กรอก", errors: parsed.errors };
  }

  try {
    await createAssetType(parsed.data);
  } catch (error) {
    return toState(error, "ไม่สามารถเพิ่มประเภทครุภัณฑ์ได้");
  }

  revalidatePath("/settings/asset-types");
  revalidatePath("/assets");
  return { status: "success", message: "เพิ่มประเภทครุภัณฑ์เรียบร้อยแล้ว", errors: {} };
}

export async function updateAssetTypeAction(
  _prevState: AssetTypeFormState,
  formData: FormData,
): Promise<AssetTypeFormState> {
  await requireUser();

  const id = Number(formData.get("id"));
  if (!Number.isInteger(id) || id <= 0) {
    return { status: "error", message: "ไม่พบรหัสอ้างอิงประเภทครุภัณฑ์", errors: {} };
  }

  const parsed = parseAssetTypeForm(formData);
  if (!parsed.ok) {
    return { status: "error", message: "กรุณาตรวจสอบข้อมูลที่กรอก", errors: parsed.errors };
  }

  try {
    await updateAssetType(id, parsed.data);
  } catch (error) {
    return toState(error, "ไม่สามารถบันทึกประเภทครุภัณฑ์ได้");
  }

  revalidatePath("/settings/asset-types");
  revalidatePath("/assets");
  return { status: "success", message: "บันทึกประเภทครุภัณฑ์เรียบร้อยแล้ว", errors: {} };
}

/**
 * Deactivating is the supported way to retire a type: assets reference it with
 * ON DELETE RESTRICT, and historical documents must keep resolving their type.
 */
export async function toggleAssetTypeActiveAction(
  _prevState: AssetTypeFormState,
  formData: FormData,
): Promise<AssetTypeFormState> {
  await requireUser();

  const id = Number(formData.get("id"));
  const isActive = String(formData.get("is_active")) === "true";

  if (!Number.isInteger(id) || id <= 0) {
    return { status: "error", message: "ไม่พบรหัสอ้างอิงประเภทครุภัณฑ์", errors: {} };
  }

  try {
    if (!isActive) {
      const inUse = await countAssetsOfType(id);
      if (inUse > 0) {
        return {
          status: "error",
          message: `ปิดใช้งานไม่ได้ เพราะมีครุภัณฑ์ ${inUse} รายการใช้ประเภทนี้อยู่`,
          errors: {},
        };
      }
    }

    await setAssetTypeActive(id, isActive);
  } catch (error) {
    return toState(error, "ไม่สามารถเปลี่ยนสถานะประเภทครุภัณฑ์ได้");
  }

  revalidatePath("/settings/asset-types");
  revalidatePath("/assets");
  return {
    status: "success",
    message: isActive ? "เปิดใช้งานประเภทครุภัณฑ์แล้ว" : "ปิดใช้งานประเภทครุภัณฑ์แล้ว",
    errors: {},
  };
}
