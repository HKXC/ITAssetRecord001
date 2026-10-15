import { describe, expect, it } from "vitest";

import { parseAssetForm } from "@/lib/validation/asset";
import { parseAssetTypeForm } from "@/lib/validation/assetType";
import { fieldErrors, isRealCalendarDate } from "@/lib/validation/common";
import { z } from "zod";

function assetForm(overrides: Record<string, string> = {}): FormData {
  const form = new FormData();
  const values: Record<string, string> = {
    asset_code: "ups-backup-01",
    asset_name: "เครื่องสำรองไฟ ห้องเซิร์ฟเวอร์",
    asset_type_id: "5",
    brand: "APC",
    model: "Smart-UPS 3000",
    serial_number: "SN-00012345",
    responsible_person: "นายสมชาย ใจดี",
    department: "ฝ่ายเทคโนโลยีสารสนเทศ",
    location: "ห้องเซิร์ฟเวอร์ ชั้น 3",
    acquisition_date: "2024-05-17",
    status: "active",
    notes: "",
    ...overrides,
  };
  for (const [key, value] of Object.entries(values)) form.set(key, value);
  return form;
}

describe("asset form", () => {
  it("accepts a complete form and normalises the asset code to upper case", () => {
    const result = parseAssetForm(assetForm());
    expect(result.ok).toBe(true);
    if (!result.ok) return;

    expect(result.data.asset_code).toBe("UPS-BACKUP-01");
    expect(result.data.asset_type_id).toBe(5);
    expect(result.data.status).toBe("active");
    // Empty optional text becomes NULL rather than an empty string.
    expect(result.data.notes).toBeNull();
  });

  it("requires the mandatory fields, with Thai messages", () => {
    const result = parseAssetForm(
      assetForm({ asset_code: "", asset_name: "", asset_type_id: "" }),
    );
    expect(result.ok).toBe(false);
    if (result.ok) return;

    expect(result.errors.asset_code).toContain("กรุณากรอกรหัสครุภัณฑ์");
    expect(result.errors.asset_name).toContain("กรุณากรอกชื่อครุภัณฑ์");
    expect(result.errors.asset_type_id).toContain("กรุณาเลือกประเภทครุภัณฑ์");
  });

  it("rejects a malformed asset code", () => {
    const result = parseAssetForm(assetForm({ asset_code: "รหัส-ไทย" }));
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.errors.asset_code).toContain("A-Z");
  });

  it("rejects a future acquisition date but accepts today", () => {
    const future = parseAssetForm(assetForm({ acquisition_date: "2999-01-01" }));
    expect(future.ok).toBe(false);
    if (!future.ok) expect(future.errors.acquisition_date).toContain("อนาคต");

    const today = new Date();
    const todayIso = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(
      today.getDate(),
    ).padStart(2, "0")}`;
    expect(parseAssetForm(assetForm({ acquisition_date: todayIso })).ok).toBe(true);
  });

  it("rejects an impossible calendar date", () => {
    const result = parseAssetForm(assetForm({ acquisition_date: "2026-02-30" }));
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.errors.acquisition_date).toContain("วันที่จริง");
  });

  it("treats an empty optional date as null", () => {
    const result = parseAssetForm(assetForm({ acquisition_date: "" }));
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.data.acquisition_date).toBeNull();
  });

  it("rejects an unknown status", () => {
    const result = parseAssetForm(assetForm({ status: "deleted" }));
    expect(result.ok).toBe(false);
  });
});

describe("asset type form", () => {
  it("accepts and normalises a valid type", () => {
    const form = new FormData();
    form.set("code", "nas");
    form.set("name", "อุปกรณ์จัดเก็บข้อมูล (NAS)");
    form.set("sort_order", "60");
    form.set("is_active", "on");

    const result = parseAssetTypeForm(form);
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.data.code).toBe("NAS");
      expect(result.data.sort_order).toBe(60);
      expect(result.data.is_active).toBe(true);
    }
  });

  it("rejects an invalid code", () => {
    const form = new FormData();
    form.set("code", "n a s!");
    form.set("name", "NAS");

    const result = parseAssetTypeForm(form);
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.errors.code).toContain("A-Z");
  });
});

describe("isRealCalendarDate", () => {
  it("distinguishes real dates from impossible ones", () => {
    expect(isRealCalendarDate("2028-02-29")).toBe(true);
    expect(isRealCalendarDate("2026-02-29")).toBe(false);
    expect(isRealCalendarDate("2026-13-01")).toBe(false);
    expect(isRealCalendarDate("2026-00-10")).toBe(false);
    expect(isRealCalendarDate("2026-1-1")).toBe(false);
  });
});

describe("fieldErrors", () => {
  it("keeps explicit Thai messages and replaces framework defaults", () => {
    const schema = z.object({
      name: z.string().min(1, "กรุณากรอกชื่อ"),
      status: z.enum(["active", "retired"]),
    });

    const parsed = schema.safeParse({ name: "", status: "unknown" });
    expect(parsed.success).toBe(false);
    if (parsed.success) return;

    const errors = fieldErrors(parsed.error, { name: "ชื่อ", status: "สถานะ" });
    expect(errors.name).toBe("กรุณากรอกชื่อ");
    // The enum message is an English default, so it is replaced with a Thai one.
    expect(errors.status).toBe("สถานะไม่ถูกต้องหรือไม่ครบถ้วน");
    expect(/[A-Za-z]/.test(errors.status.replace("status", ""))).toBe(false);
  });
});
