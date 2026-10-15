import type { Metadata } from "next";
import { Noto_Sans_Thai } from "next/font/google";

import "./globals.css";

/**
 * The Thai subset is required for Thai text; the latin subset keeps asset codes, serial
 * numbers and dates consistent. Next.js self-hosts the files at build time.
 */
const notoSansThai = Noto_Sans_Thai({
  subsets: ["thai", "latin"],
  weight: ["400", "500", "700"],
  display: "swap",
  variable: "--font-noto-thai",
});

export const metadata: Metadata = {
  title: "ระบบบริหารจัดการครุภัณฑ์ IT",
  description: "ระบบทะเบียนครุภัณฑ์ไอที การค้นหา และการออกเอกสาร PDF",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="th" className={notoSansThai.variable}>
      <body className="min-h-screen bg-canvas text-ink antialiased">{children}</body>
    </html>
  );
}
