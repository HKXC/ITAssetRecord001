import fs from "node:fs";
import path from "node:path";

import { PDFParse } from "pdf-parse";
import { afterAll, describe, expect, it } from "vitest";

import type { AssetWithType } from "@/lib/database.types";
import { closeBrowser, getBrowser } from "@/lib/pdf/browser";
import { renderHtmlToPdf } from "@/lib/pdf/render";
import { renderAssetDocumentHtml, renderRegisterDocumentHtml } from "@/lib/pdf/templates";

/**
 * Phase 5 integration check: real Chromium, real Thai text, real PDF bytes.
 *
 * This test is the evidence behind the PDF engine decision, so it asserts on extracted
 * text and on rendered ink rather than merely "no exception was thrown".
 *
 * Known Chromium text-layer limitation
 * ------------------------------------
 * Chromium writes Thai combining tone marks into the PDF's ToUnicode map as NUL and
 * decomposes sara am (ำ → ํา). The glyphs are still drawn — the ink check below proves
 * that — but copy/paste from the PDF loses those marks. `normalize()` strips exactly those
 * two artifacts so structural assertions stay meaningful instead of being weakened to
 * nothing. The visual appearance is checked by the PNG artifacts written to artifacts/.
 */

const ARTIFACTS_DIR = path.join(process.cwd(), "artifacts");

// Thai needs combining vowel/tone marks (เก่ง, ที่, ปั๊ม, น้ำ); Thai is also written without
// spaces, so a long unbroken string must still wrap inside a narrow cell.
const THAI_CORPUS = {
  marked: "เก่ง ที่ วันที่ ปั๊ม น้ำ",
  unspaced: "เครื่องสำรองไฟฟ้าสำหรับห้องเซิร์ฟเวอร์หลักของอาคารเทคโนโลยีสารสนเทศ",
};

function normalize(text: string): string {
  return text
    .replace(/\u0000/g, "")
    .replace(/\u0E33/g, "\u0E4D\u0E32")
    .replace(/[\u0E47-\u0E4E]/g, "");
}

function expectContains(haystack: string, needle: string) {
  expect(
    normalize(haystack).includes(normalize(needle)),
    `expected extracted PDF text to contain ${JSON.stringify(needle)}`,
  ).toBe(true);
}

function makeAsset(overrides: Partial<AssetWithType> = {}): AssetWithType {
  return {
    id: "11111111-1111-4111-8111-111111111111",
    asset_code: "UPS-BACKUP-01",
    asset_name: `เครื่องสำรองไฟ ${THAI_CORPUS.marked}`,
    asset_type_id: 5,
    brand: "APC",
    model: "Smart-UPS 3000",
    serial_number: "SN-00012345",
    responsible_person: "นายสมชาย ใจดี",
    department: "ฝ่ายเทคโนโลยีสารสนเทศ",
    location: "ห้องเซิร์ฟเวอร์ ชั้น 3",
    acquisition_date: "2024-05-17",
    status: "active",
    notes: null,
    created_at: "2024-05-20T03:00:00.000Z",
    updated_at: "2026-10-12T03:00:00.000Z",
    created_by: null,
    updated_by: null,
    asset_types: { code: "UPS", name: "เครื่องสำรองไฟ (UPS)" },
    ...overrides,
  };
}

async function extractPdf(pdf: Buffer) {
  const parser = new PDFParse({ data: pdf });
  try {
    const result = await parser.getText();
    return { text: result.text, pages: result.total };
  } finally {
    await parser.destroy();
  }
}

function writeArtifact(name: string, contents: Buffer | string) {
  fs.mkdirSync(ARTIFACTS_DIR, { recursive: true });
  fs.writeFileSync(path.join(ARTIFACTS_DIR, name), contents);
}

afterAll(async () => {
  await closeBrowser();
});

describe("individual asset document", () => {
  it("renders the asset, document number and พ.ศ. date into the PDF", async () => {
    const documentNumber = "ITA-UPS-2610-0001";
    const html = renderAssetDocumentHtml({
      asset: makeAsset(),
      documentNumber,
      revision: 1,
      generatedAt: new Date("2026-10-12T03:00:00.000Z"),
      organizationName: "ฝ่ายเทคโนโลยีสารสนเทศ",
    });

    const pdf = await renderHtmlToPdf(html, { documentNumber });
    expect(pdf.subarray(0, 5).toString("latin1")).toBe("%PDF-");

    const { text, pages } = await extractPdf(pdf);

    expectContains(text, documentNumber);
    expectContains(text, "UPS-BACKUP-01");
    expectContains(text, "SN-00012345");
    expectContains(text, "เอกสารข้อมูลครุภัณฑ์");
    expectContains(text, "นายสมชาย ใจดี");

    // 2026-10-12 in Buddhist Era, with the Thai month name.
    expectContains(text, "12 ตุลาคม 2569");

    // Thai content with combining marks round-trips structurally.
    expectContains(text, "เครื่องสำรองไฟ");
    expectContains(text, "เก่ง");
    expectContains(text, "ที่");
    expectContains(text, "วันที่");
    expectContains(text, "น้ำ");

    expect(pages).toBe(1);

    writeArtifact("sample-asset-document.pdf", pdf);
  });

  it("draws Thai combining marks instead of dropping them", async () => {
    // Objective rendering check: if a tone mark were dropped (missing glyph), the marked
    // string would draw exactly as much ink as its base string.
    const html = renderAssetDocumentHtml({
      asset: makeAsset(),
      documentNumber: "ITA-UPS-2610-0001",
      revision: 1,
      generatedAt: new Date("2026-10-12T03:00:00.000Z"),
      organizationName: "ฝ่ายเทคโนโลยีสารสนเทศ",
    });

    const browser = await getBrowser();
    const page = await browser.newPage();

    try {
      await page.setContent(html, { waitUntil: "load" });
      await page.evaluate(() => document.fonts?.ready);

      const pairs = [
        ["เก่ง", "เกง"],
        ["ที่", "ท"],
        ["ปั๊ม", "ปม"],
        ["น้ำ", "นา"],
      ];

      const results = await page.evaluate((input: string[][]) => {
        const inkOf = (text: string) => {
          const canvas = document.createElement("canvas");
          canvas.width = 300;
          canvas.height = 120;
          const context = canvas.getContext("2d");
          if (!context) throw new Error("2d context unavailable");
          context.clearRect(0, 0, canvas.width, canvas.height);
          context.font = "48px 'NotoSansThaiDoc'";
          context.fillStyle = "#000000";
          context.fillText(text, 10, 80);
          const data = context.getImageData(0, 0, canvas.width, canvas.height).data;
          let ink = 0;
          for (let index = 3; index < data.length; index += 4) {
            if (data[index] > 0) ink += 1;
          }
          return ink;
        };

        return input.map(([marked, base]) => ({
          marked,
          base,
          markedInk: inkOf(marked),
          baseInk: inkOf(base),
        }));
      }, pairs);

      for (const result of results) {
        expect(result.markedInk, `${result.marked} should draw ink`).toBeGreaterThan(0);
        expect(
          result.markedInk,
          `${result.marked} (${result.markedInk}px) should draw more ink than ${result.base} (${result.baseInk}px)`,
        ).toBeGreaterThan(result.baseInk);
      }

      // Also keep a screenshot for human review of mark placement.
      await page.setViewport({ width: 794, height: 1123 });
      const screenshot = await page.screenshot({ fullPage: true });
      writeArtifact("sample-asset-document.png", Buffer.from(screenshot));
    } finally {
      await page.close();
    }
  });
});

describe("consolidated register document", () => {
  function buildRegister(assetCount: number) {
    const assets = Array.from({ length: assetCount }, (_, index) =>
      makeAsset({
        id: `22222222-2222-4222-8222-${String(index).padStart(12, "0")}`,
        asset_code: `UPS-BACKUP-${String(index + 1).padStart(3, "0")}`,
        asset_name: index === 0 ? THAI_CORPUS.unspaced : `เครื่องสำรองไฟลำดับที่ ${index + 1}`,
        serial_number: `SN-${String(index + 1).padStart(6, "0")}`,
      }),
    );

    return {
      assets,
      html: renderRegisterDocumentHtml({
        assets,
        documentNumber: "REG-261012-0002",
        revision: 1,
        generatedAt: new Date("2026-10-12T03:00:00.000Z"),
        organizationName: "ฝ่ายเทคโนโลยีสารสนเทศ",
        selectionNote: "ประเภท: UPS, สถานะ: ใช้งาน",
      }),
    };
  }

  it("paginates, repeats the table header and reports the exact row count", async () => {
    const { assets, html } = buildRegister(120);
    const pdf = await renderHtmlToPdf(html, { documentNumber: "REG-261012-0002", landscape: true });
    const { text, pages } = await extractPdf(pdf);

    expectContains(text, "REG-261012-0002");
    expectContains(text, "จำนวนรายการทั้งหมด");
    expectContains(text, "120 รายการ");
    expectContains(text, "UPS-BACKUP-001");
    expectContains(text, "UPS-BACKUP-120");
    expectContains(text, "เกณฑ์การเลือกรายการ");

    // A 120-row table must break across pages.
    expect(pages).toBeGreaterThan(1);
    // ... but a fixed column layout must keep rows compact (portrait previously needed 14).
    expect(pages, `120 rows rendered over ${pages} pages`).toBeLessThanOrEqual(6);

    // The header repeats on every page, one occurrence of a header cell per page.
    const headerHits = text.split("สถานะ").length - 1;
    expect(headerHits, `header should repeat once per page (${pages} pages)`).toBeGreaterThanOrEqual(
      pages,
    );
    expect(assets).toHaveLength(120);

    writeArtifact("sample-register.pdf", pdf);
  });

  it("keeps long unspaced Thai text inside its table cell", async () => {
    const { html } = buildRegister(1);

    const browser = await getBrowser();
    const page = await browser.newPage();

    try {
      // Emulate the printable area: A4 landscape (297mm) with 12mm side margins.
      const PRINTABLE_WIDTH = Math.round(((297 - 24) / 25.4) * 96);
      await page.setViewport({ width: PRINTABLE_WIDTH, height: 800 });
      await page.setContent(html, { waitUntil: "load" });
      await page.evaluate(() => document.fonts?.ready);

      const measurement = await page.evaluate(() => {
        const table = document.querySelector("table.register");
        const overflowing: string[] = [];
        for (const cell of Array.from(
          document.querySelectorAll("table.register td, table.register th"),
        )) {
          if (cell.scrollWidth > cell.clientWidth + 1) {
            overflowing.push((cell.textContent ?? "").slice(0, 30));
          }
        }
        return { tableWidth: table ? table.scrollWidth : 0, overflowing };
      });

      expect(measurement.tableWidth).toBeLessThanOrEqual(PRINTABLE_WIDTH + 2);
      expect(measurement.overflowing).toEqual([]);
    } finally {
      await page.close();
    }
  });
});
