import type { ThaiFonts } from "@/lib/pdf/font";

export type DocumentOrientation = "portrait" | "landscape";

/**
 * Print stylesheet for generated documents.
 *
 * Deliberate choices, each verified by tests/integration/pdf.test.ts:
 *   - the Thai font is embedded as a data URL, so Chromium never falls back;
 *   - `line-height: 1.6-1.7` leaves room for upper/lower Thai marks, which tight leading
 *     clips;
 *   - `thead { display: table-header-group }` repeats the header on every page, and
 *     `break-inside: avoid` keeps rows whole;
 *   - `table-layout: fixed` with a <colgroup> stops an 11-column table from exceeding the
 *     page width (measured: it used to overflow and wrap every row over 5+ lines);
 *   - `overflow-wrap: anywhere` guarantees a long unspaced Thai string or a long asset code
 *     can never overflow its cell.
 *
 * Colours mirror the application tokens so screen and paper match.
 */
export function documentCss(fonts: ThaiFonts, orientation: DocumentOrientation = "portrait"): string {
  return `
@font-face {
  font-family: 'NotoSansThaiDoc';
  src: url(${fonts.regular}) format('truetype');
  font-weight: 400;
  font-style: normal;
}
@font-face {
  font-family: 'NotoSansThaiDoc';
  src: url(${fonts.bold}) format('truetype');
  font-weight: 700;
  font-style: normal;
}

@page {
  size: A4 ${orientation};
}

* { box-sizing: border-box; }

html, body {
  margin: 0;
  padding: 0;
}

body {
  font-family: 'NotoSansThaiDoc', 'Noto Sans Thai', 'Leelawadee UI', sans-serif;
  color: #252B26;
  font-size: 11pt;
  line-height: 1.7;
  -webkit-print-color-adjust: exact;
  print-color-adjust: exact;
}

.doc-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-end;
  gap: 12mm;
  border-bottom: 2px solid #27834A;
  padding-bottom: 4mm;
  margin-bottom: 6mm;
}

.doc-org {
  font-size: 10pt;
  color: #252B26;
}

.doc-title {
  font-size: ${orientation === "landscape" ? "15pt" : "16pt"};
  font-weight: 700;
  margin: 2mm 0 0 0;
}

.doc-meta {
  text-align: right;
  font-size: 9.5pt;
  white-space: nowrap;
}

.doc-meta div { margin-bottom: 1mm; }

.doc-meta .label { color: #4A534B; }

.mono { font-variant-numeric: tabular-nums; }

.nowrap { white-space: nowrap; }

table.fields {
  width: 100%;
  border-collapse: collapse;
  margin-bottom: 6mm;
}

table.fields th,
table.fields td {
  border: 1px solid #E4E7E4;
  padding: 2.2mm 3mm;
  vertical-align: top;
  text-align: left;
  overflow-wrap: anywhere;
}

table.fields th {
  width: 32mm;
  background: #F7F9F7;
  font-weight: 400;
  color: #3B433C;
}

table.register {
  width: 100%;
  table-layout: fixed;
  border-collapse: collapse;
  font-size: 8pt;
  line-height: 1.45;
}

table.register thead {
  display: table-header-group;
}

table.register th,
table.register td {
  border: 1px solid #E4E7E4;
  padding: 1mm 1.4mm;
  vertical-align: top;
  text-align: left;
  overflow-wrap: anywhere;
  word-break: normal;
}

table.register thead th {
  background: #F7F9F7;
  font-weight: 700;
}

table.register tr {
  break-inside: avoid;
  page-break-inside: avoid;
}

table.register td.num,
table.register th.num {
  text-align: right;
  font-variant-numeric: tabular-nums;
}

.doc-summary {
  margin-top: 4mm;
  font-size: 9.5pt;
  display: flex;
  justify-content: space-between;
  gap: 10mm;
}

.doc-note {
  margin-top: 3mm;
  font-size: 8.5pt;
  color: #4A534B;
}
`.trim();
}

/**
 * Footer for every page.
 *
 * Chromium does not inherit page fonts into header/footer templates, so the Thai font is
 * embedded again here; without it "หน้า" would silently render in a fallback font.
 */
export function documentFooterTemplate(fonts: ThaiFonts, documentNumber: string): string {
  return `
<div style="width: 100%; padding: 0 12mm; font-family: 'NotoSansThaiDoc', sans-serif; font-size: 8pt; color: #4A534B;">
  <style>
    @font-face {
      font-family: 'NotoSansThaiDoc';
      src: url(${fonts.regular}) format('truetype');
      font-weight: 400;
    }
    .footer-row { display: flex; justify-content: space-between; }
  </style>
  <div class="footer-row">
    <span>${documentNumber}</span>
    <span>หน้า <span class="pageNumber"></span> / <span class="totalPages"></span></span>
  </div>
</div>`.trim();
}

export const EMPTY_HEADER_TEMPLATE = '<span style="font-size: 1pt;"></span>';

/**
 * Column widths of the consolidated register, as percentages of the printable width.
 *
 * Measured against real Thai content (see tests/integration/pdf.test.ts): when a column is
 * too narrow its Thai text wraps, and because every row of a fixed table is as tall as its
 * tallest cell, one cramped column multiplies the page count for the whole document. These
 * widths keep all but unusually long values on a single line.
 */
export const REGISTER_COLUMN_WIDTHS = [
  "3%", // ลำดับ
  "12%", // รหัสครุภัณฑ์
  "20%", // ชื่อครุภัณฑ์
  "6%", // ประเภท (asset type code)
  "12%", // หมายเลขเครื่อง
  "10%", // ผู้รับผิดชอบ
  "13%", // แผนก
  "11%", // สถานที่
  "5%", // สถานะ
  "8%", // วันที่ได้มา (short month form)
] as const;
