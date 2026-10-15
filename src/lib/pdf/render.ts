import { serverEnv } from "@/env";
import { AppError } from "@/lib/errors";
import { getBrowser } from "@/lib/pdf/browser";
import { loadThaiFonts } from "@/lib/pdf/font";
import { EMPTY_HEADER_TEMPLATE, documentFooterTemplate } from "@/lib/pdf/styles";

export type RenderPdfOptions = {
  documentNumber: string;
  /** Landscape is used for the consolidated register, which has eleven columns. */
  landscape?: boolean;
};

/**
 * Renders complete HTML to an A4 PDF buffer.
 *
 * The font is embedded in the HTML, so the only wait that matters is `document.fonts.ready`
 * — without it Chromium can print before the embedded Thai font is applied.
 */
export async function renderHtmlToPdf(html: string, options: RenderPdfOptions): Promise<Buffer> {
  const { browserTimeoutMs } = serverEnv();
  const fonts = loadThaiFonts();
  const browser = await getBrowser();
  const page = await browser.newPage();

  try {
    page.setDefaultTimeout(browserTimeoutMs);
    // The document has no external resources (the font is inlined as a data URL), so
    // "load" plus document.fonts.ready is all that is needed before printing.
    await page.setContent(html, { waitUntil: "load", timeout: browserTimeoutMs });
    await page.evaluate(() => document.fonts?.ready);

    const pdf = await page.pdf({
      format: "A4",
      landscape: options.landscape ?? false,
      printBackground: true,
      displayHeaderFooter: true,
      headerTemplate: EMPTY_HEADER_TEMPLATE,
      footerTemplate: documentFooterTemplate(fonts, options.documentNumber),
      margin: { top: "16mm", right: "12mm", bottom: "18mm", left: "12mm" },
      timeout: browserTimeoutMs,
    });

    return Buffer.from(pdf);
  } catch (error) {
    console.error("[pdf] render failed", error);
    throw new AppError(
      "สร้างไฟล์ PDF ไม่สำเร็จ กรุณาลองใหม่อีกครั้ง",
      "PDF_RENDER_FAILED",
      500,
    );
  } finally {
    await page.close().catch(() => undefined);
  }
}
