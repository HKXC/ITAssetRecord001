import { formatThaiDate, formatThaiDateTime } from "@/lib/format/thaiDate";
import type { AssetStatus } from "@/lib/database.types";
import { ASSET_STATUS_LABELS } from "@/lib/validation/asset";

export type RegisterDocumentProps = {
  assets: ReadonlyArray<{
    id: string;
    asset_code: string;
    asset_name: string;
    asset_types: { code: string; name: string } | null;
    serial_number: string | null;
    responsible_person: string | null;
    department: string | null;
    location: string | null;
    status: string;
    acquisition_date: Date | string | null;
  }>;
  documentNumber: string;
  revision: number;
  generatedAt: Date;
  organizationName: string;
  /** Optional description of how the set was chosen (filter summary), printed under the table. */
  selectionNote?: string | null;
};

const COLGROUP = `<colgroup>
  <col style="width:3%">
  <col style="width:12%">
  <col style="width:20%">
  <col style="width:6%">
  <col style="width:12%">
  <col style="width:10%">
  <col style="width:13%">
  <col style="width:11%">
  <col style="width:5%">
  <col style="width:8%">
</colgroup>`;

/**
 * Consolidated register body.
 *
 * Returns a plain HTML string so the PDF template layer stays server-only and is never
 * bundled as a Next.js Server Component.
 *
 * Rendered in landscape (see renderHtmlToPdf). Measured on real Thai content:
 *   - portrait wrapped every row over five or more lines (14 pages for 120 assets);
 *   - landscape with a fixed column layout still reached 12 pages, because a single cramped
 *     column makes every row as tall as its tallest cell.
 * The layout below keeps rows on one line: the type is shown as its short code and
 * brand/model are omitted, since the individual asset document carries the full details.
 */
export function RegisterDocument({
  assets,
  documentNumber,
  revision,
  generatedAt,
  organizationName,
  selectionNote,
}: RegisterDocumentProps): string {
  const headerRow = [
    "<th class=\"num\">ลำดับ</th>",
    "<th>รหัสครุภัณฑ์</th>",
    "<th>ชื่อครุภัณฑ์</th>",
    "<th>ประเภท</th>",
    "<th>หมายเลขเครื่อง</th>",
    "<th>ผู้รับผิดชอบ</th>",
    "<th>แผนก</th>",
    "<th>สถานที่</th>",
    "<th>สถานะ</th>",
    "<th>วันที่ได้มา</th>",
  ].join("");

  const bodyRows = assets
    .map(
      (asset, index) =>
        `<tr>
          <td class="num">${index + 1}</td>
          <td class="mono nowrap">${escapeHtml(asset.asset_code)}</td>
          <td>${escapeHtml(asset.asset_name)}</td>
          <td class="nowrap">${asset.asset_types?.code ?? "-"}</td>
          <td class="mono nowrap">${escapeHtml(asset.serial_number ?? "-")}</td>
          <td>${escapeHtml(asset.responsible_person ?? "-")}</td>
          <td>${escapeHtml(asset.department ?? "-")}</td>
          <td>${escapeHtml(asset.location ?? "-")}</td>
          <td>${ASSET_STATUS_LABELS[asset.status as AssetStatus] ?? asset.status}</td>
          <td>${formatThaiDate(asset.acquisition_date, { short: true })}</td>
        </tr>`,
    )
    .join("");

  return `
    <article>
      <header class="doc-header">
        <div>
          <div class="doc-org">${organizationName}</div>
          <h1 class="doc-title">ทะเบียนครุภัณฑ์ (รายการรวม)</h1>
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

      <table class="register">
        ${COLGROUP}
        <thead><tr>${headerRow}</tr></thead>
        <tbody>${bodyRows}</tbody>
      </table>

      <div class="doc-summary">
        <span>
          <strong>จำนวนรายการทั้งหมด: </strong>
          ${assets.length} รายการ
        </span>
        <span>
          <strong>พิมพ์เมื่อ: </strong>
          ${formatThaiDateTime(generatedAt)}
        </span>
      </div>

      ${selectionNote ? `<div class="doc-note"><strong>เกณฑ์การเลือกรายการ: </strong>${selectionNote}</div>` : ""}

      <div class="doc-note">
        เอกสารนี้จัดทำโดยระบบบริหารจัดการครุภัณฑ์ ไอที รายการที่แสดงตรงกับรายการที่เลือกไว้ในระบบ
      </div>
    </article>
  `.trim().replace(/^\s+/gm, " ");
}

/**
 * Minimal HTML escaper for user-controlled strings that end up in the register.
 *
 * Asset names and locations are free-text fields; the rest are fixed token sets. This keeps
 * the register HTML generation on the safe side without pulling in a template library.
 */
function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}
