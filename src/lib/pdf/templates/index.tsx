import { AssetDocument, type AssetDocumentProps } from "./AssetDocument";
import { RegisterDocument, type RegisterDocumentProps } from "./RegisterDocument";
import { loadThaiFonts } from "@/lib/pdf/font";
import { documentCss } from "@/lib/pdf/styles";

/**
 * Documents are rendered to a complete HTML string and handed to Chromium with
 * `page.setContent()`.
 *
 * Deliberately not a web route: there is no print URL to expose, no auth cookie for
 * Chromium to carry, and the same templates cannot drift from what the server renders.
 */
function wrapDocument(body: string, orientation: "portrait" | "landscape"): string {
  const fonts = loadThaiFonts();
  return [
    "<!DOCTYPE html>",
    '<html lang="th">',
    "<head>",
    '<meta charset="utf-8" />',
    "<title>เอกสารครุภัณฑ์</title>",
    `<style>${documentCss(fonts, orientation)}</style>`,
    "</head>",
    `<body>${body}</body>`,
    "</html>",
  ].join("");
}

/** One asset per document, portrait. */
export function renderAssetDocumentHtml(props: AssetDocumentProps): string {
  const body = AssetDocument({ ...props });
  return wrapDocument(body, "portrait");
}

/** Many assets per document, landscape (eleven columns do not fit A4 portrait). */
export function renderRegisterDocumentHtml(props: RegisterDocumentProps): string {
  const body = RegisterDocument({ ...props });
  return wrapDocument(body, "landscape");
}

export type { AssetDocumentProps, RegisterDocumentProps };
