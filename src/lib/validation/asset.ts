import { z } from "zod";

import type { AssetStatus } from "@/lib/database.types";
import {
  TEXT_LIMITS,
  fieldErrors,
  formDataToObject,
  optionalIsoDate,
  optionalInt,
  optionalText,
  requiredPositiveInt,
  requiredText,
} from "@/lib/validation/common";

export const ASSET_STATUSES = ["active", "in_repair", "retired", "disposed", "lost"] as const;

export const ASSET_STATUS_LABELS: Record<AssetStatus, string> = {
  active: "ใช้งาน",
  in_repair: "ซ่อม/ปรับปรุง",
  retired: "ปลดระวาง",
  disposed: "จำหน่าย/ตัดบัญชี",
  lost: "สูญหาย",
};

export const ASSET_FIELD_LABELS: Record<string, string> = {
  asset_code: "รหัสครุภัณฑ์",
  asset_name: "ชื่อครุภัณฑ์",
  asset_type_id: "ประเภทครุภัณฑ์",
  brand: "ยี่ห้อ",
  model: "รุ่น",
  serial_number: "หมายเลขเครื่อง",
  responsible_person: "ผู้รับผิดชอบ",
  department: "แผนก/หน่วยงาน",
  location: "สถานที่ตั้ง",
  acquisition_date: "วันที่ได้มา",
  status: "สถานะ",
  notes: "หมายเหตุ",
};

/** Asset code: A-Z, 0-9 and . _ / - — stored upper-case. */
export const ASSET_CODE_PATTERN = /^[A-Z0-9][A-Z0-9._/-]{2,31}$/;

const NOT_IN_THE_FUTURE = "วันที่ได้มาต้องไม่เป็นวันในอนาคต";

export const assetFormSchema = z
  .object({
    asset_code: z.preprocess(
      (value) => (typeof value === "string" ? value.trim().toUpperCase() : ""),
      z
        .string()
        .min(1, "กรุณากรอกรหัสครุภัณฑ์")
        .max(TEXT_LIMITS.code, `รหัสครุภัณฑ์ยาวเกิน ${TEXT_LIMITS.code} ตัวอักษร`)
        .regex(
          ASSET_CODE_PATTERN,
          "รหัสครุภัณฑ์ต้องขึ้นต้นด้วยตัวอักษรหรือตัวเลข และใช้ได้เฉพาะ A-Z 0-9 . _ / - (3-32 ตัวอักษร)",
        ),
    ),
    asset_name: requiredText(200, "ชื่อครุภัณฑ์"),
    asset_type_id: requiredPositiveInt("กรุณาเลือกประเภทครุภัณฑ์"),
    brand: optionalText(TEXT_LIMITS.short, "ยี่ห้อ"),
    model: optionalText(TEXT_LIMITS.short, "รุ่น"),
    serial_number: optionalText(TEXT_LIMITS.short, "หมายเลขเครื่อง"),
    responsible_person: optionalText(TEXT_LIMITS.medium, "ผู้รับผิดชอบ"),
    department: optionalText(TEXT_LIMITS.medium, "แผนก/หน่วยงาน"),
    location: optionalText(TEXT_LIMITS.medium, "สถานที่ตั้ง"),
    acquisition_date: optionalIsoDate("วันที่ได้มา"),
    status: z.enum(ASSET_STATUSES),
    notes: optionalText(TEXT_LIMITS.long, "หมายเหตุ"),
  })
  .refine(
    (value) => {
      if (!value.acquisition_date) return true;
      const today = new Date();
      const todayIso = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(
        today.getDate(),
      ).padStart(2, "0")}`;
      return value.acquisition_date <= todayIso;
    },
    { message: NOT_IN_THE_FUTURE, path: ["acquisition_date"] },
  );

export type AssetFormInput = z.infer<typeof assetFormSchema>;

export function parseAssetForm(formData: FormData) {
  const parsed = assetFormSchema.safeParse(formDataToObject(formData));
  return parsed.success
    ? { ok: true as const, data: parsed.data }
    : { ok: false as const, errors: fieldErrors(parsed.error, ASSET_FIELD_LABELS) };
}

export const ASSET_SORT_FIELDS = [
  "asset_code",
  "asset_name",
  "acquisition_date",
  "created_at",
] as const;

export const assetSearchSchema = z.object({
  q: z.preprocess(
    (value) => (typeof value === "string" ? value.trim().slice(0, 100) : ""),
    z.string().transform((value) => (value === "" ? null : value)),
  ),
  asset_type_id: optionalInt("ประเภทครุภัณฑ์"),
  department: optionalText(150, "แผนก/หน่วยงาน"),
  location: optionalText(150, "สถานที่ตั้ง"),
  status: z.preprocess(
    (value) => (typeof value === "string" ? value.trim() : ""),
    z
      .enum(ASSET_STATUSES)
      .or(z.literal(""))
      .transform((value) => (value === "" ? null : (value as AssetStatus))),
  ),
  page: z.preprocess(
    (value) => (value === undefined || value === null || value === "" ? 1 : value),
    z.coerce.number().int().min(1, "เลขหน้าไม่ถูกต้อง"),
  ),
  per_page: z.preprocess(
    (value) => (value === undefined || value === null || value === "" ? 25 : value),
    z.coerce.number().int().min(1).max(100),
  ),
  sort: z.preprocess(
    (value) =>
      typeof value === "string" && (ASSET_SORT_FIELDS as readonly string[]).includes(value)
        ? value
        : "asset_code",
    z.enum(ASSET_SORT_FIELDS),
  ),
  dir: z.preprocess(
    (value) => (value === "desc" ? "desc" : "asc"),
    z.enum(["asc", "desc"]),
  ),
});

export type AssetSearchInput = z.infer<typeof assetSearchSchema>;

/** Parses URL search params; never throws — invalid input falls back to defaults. */
export function parseAssetSearch(params: Record<string, string | string[] | undefined>): AssetSearchInput {
  const flat: Record<string, string> = {};
  for (const [key, value] of Object.entries(params)) {
    if (typeof value === "string") flat[key] = value;
    else if (Array.isArray(value) && value.length > 0) flat[key] = value[0];
  }

  const parsed = assetSearchSchema.safeParse(flat);
  if (parsed.success) return parsed.data;

  return assetSearchSchema.parse({});
}
