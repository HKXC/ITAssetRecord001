import { z } from "zod";

import {
  fieldErrors,
  formDataToObject,
  optionalInt,
  requiredText,
} from "@/lib/validation/common";

export const ASSET_TYPE_FIELD_LABELS: Record<string, string> = {
  code: "รหัสประเภท",
  name: "ชื่อประเภท",
  sort_order: "ลำดับการแสดง",
};

export const ASSET_TYPE_CODE_PATTERN = /^[A-Z0-9_]{2,16}$/;

export const assetTypeFormSchema = z.object({
  code: z.preprocess(
    (value) => (typeof value === "string" ? value.trim().toUpperCase() : ""),
    z
      .string()
      .min(1, "กรุณากรอกรหัสประเภท")
      .regex(ASSET_TYPE_CODE_PATTERN, "รหัสประเภทใช้ได้เฉพาะ A-Z 0-9 และ _ (2-16 ตัวอักษร)"),
  ),
  name: requiredText(120, "ชื่อประเภท"),
  sort_order: z.preprocess(
    (value) => (value === undefined || value === null || value === "" ? 0 : value),
    z.coerce.number().int().min(0),
  ),
  is_active: z.preprocess(
    (value) => value === "true" || value === "on" || value === "1",
    z.boolean(),
  ),
});

export type AssetTypeFormInput = z.infer<typeof assetTypeFormSchema>;

export function parseAssetTypeForm(formData: FormData) {
  const parsed = assetTypeFormSchema.safeParse(formDataToObject(formData));
  return parsed.success
    ? { ok: true as const, data: parsed.data }
    : { ok: false as const, errors: fieldErrors(parsed.error, ASSET_TYPE_FIELD_LABELS) };
}

export const assetTypeSearchSchema = z.object({
  include_inactive: z.preprocess(
    (value) => value === "1" || value === "true",
    z.boolean(),
  ),
  limit: optionalInt("จำนวนรายการ"),
});
