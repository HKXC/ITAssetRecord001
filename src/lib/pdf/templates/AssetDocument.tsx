import type { AssetWithType } from "@/lib/database.types";
import { formatThaiDate, formatThaiDateTime } from "@/lib/format/thaiDate";
import { ASSET_STATUS_LABELS } from "@/lib/validation/asset";

/**
 * Individual asset document body.
 *
 * Kept as a JSX function so the asset detail and PDF templates share the same shape and
 * so optional/nested data is easy to read; the PDF template layer is compiled only for the
 * server route and is never bundled as a Next.js Server Component.
 */

export type AssetDocumentProps = {
  asset: AssetWithType;
  documentNumber: string;
  revision: number;
  generatedAt: Date;
  organizationName: string;
};

type Field = { label: string; value: string };

/** Builds the label/value grid; two fields per printed row. */
function buildFields(asset: AssetWithType): Field[] {
  return [
    { label: "รหัสครุภัณฑ์", value: asset.asset_code },
    { label: "ประเภทครุภัณฑ์", value: asset.asset_types?.name ?? "-" },
    { label: "ชื่อครุภัณฑ์", value: asset.asset_name },
    { label: "ยี่ห้อ / รุ่น", value: [asset.brand, asset.model].filter(Boolean).join(" / ") || "-" },
    { label: "หมายเลขเครื่อง (Serial)", value: asset.serial_number ?? "-" },
    { label: "วันที่ได้มา", value: formatThaiDate(asset.acquisition_date) },
    { label: "ผู้รับผิดชอบ", value: asset.responsible_person ?? "-" },
    { label: "แผนก / หน่วยงาน", value: asset.department ?? "-" },
    { label: "สถานที่ตั้ง", value: asset.location ?? "-" },
    { label: "สถานะ", value: ASSET_STATUS_LABELS[asset.status] ?? asset.status },
    { label: "ลงทะเบียนในระบบ", value: formatThaiDate(asset.created_at) },
    { label: "แก้ไขล่าสุด", value: formatThaiDateTime(asset.updated_at) },
  ];
}

/**
 * Individual asset document body.
 *
 * Returns a plain HTML string so the PDF template layer stays server-only and is never
 * bundled as a Next.js Server Component.
 */
export function AssetDocument({
  asset,
  documentNumber,
  revision,
  generatedAt,
  organizationName,
}: AssetDocumentProps): string {
  const fields = buildFields(asset);
  const rows: Field[][] = [];
  for (let index = 0; index < fields.length; index += 2) {
    const row = fields.slice(index, index + 2);
    // Keep every row a full label/value pair so the grid stays aligned.
    if (row.length === 1) row.push({ label: "", value: "" });
    rows.push(row);
  }

  const labelCells = rows.flatMap((row) => row.map((f) => f.label)).join("");
  const valueCells = rows.flatMap((row) => row.map((f) => f.value)).join("");

  return `
    <article>
      <header class="doc-header">
        <div>
          <div class="doc-org">${organizationName}</div>
          <h1 class="doc-title">เอกสารข้อมูลครุภัณฑ์</h1>
        </div>
        <div class="doc-meta">
          <div>
            <span class="label">เลขที่เอกสาร: </span>
            <span class="mono">${documentNumber}</span>
          </div>
          <div>
            <span class="label">พิมพ์ครั้งที่: </span>
            <span class="mono">${revision}</span>
          </div>
          <div>
            <span class="label">วันที่จัดทำ: </span>
            ${formatThaiDate(generatedAt)}
          </div>
        </div>
      </header>

      <table class="fields">
        <tbody>
          <tr>
            ${labelCells}
          </tr>
          <tr>
            ${valueCells}
          </tr>
        </tbody>
      </table>

      ${asset.notes ? `<div class="doc-note"><strong>หมายเหตุ: </strong>${asset.notes}</div>` : ""}

      <div class="doc-note">
        เอกสารนี้จัดทำโดยระบบบริหารจัดการครุภัณฑ์ ไอที ข้อมูล ณ วันที่ ${formatThaiDateTime(generatedAt)}
      </div>
    </article>
  `.trim().replace(/^\s+/gm, " ");
}
