import { describe, expect, it } from "vitest";

import { assetDocumentPath, registerDocumentPath } from "@/lib/services/numbering";

describe("storage paths", () => {
  it("builds an immutable path per asset document revision", () => {
    expect(assetDocumentPath("UPS-BACKUP-01", "ITA-UPS-2610-0001", 1)).toBe(
      "asset/UPS-BACKUP-01/ITA-UPS-2610-0001-r1.pdf",
    );
    expect(assetDocumentPath("UPS-BACKUP-01", "ITA-UPS-2610-0001", 2)).toBe(
      "asset/UPS-BACKUP-01/ITA-UPS-2610-0001-r2.pdf",
    );
  });

  it("groups registers by Gregorian month (storage paths stay ISO; only documents use พ.ศ.)", () => {
    expect(registerDocumentPath("REG-261012-0002", 1, new Date("2026-10-12T03:00:00.000Z"))).toBe(
      "register/2026-10/REG-261012-0002-r1.pdf",
    );
    expect(registerDocumentPath("REG-261012-0002", 2, new Date("2026-10-12T03:00:00.000Z"))).toBe(
      "register/2026-10/REG-261012-0002-r2.pdf",
    );
  });

  it("never produces the same path for two revisions", () => {
    const first = registerDocumentPath("REG-261012-0002", 1, new Date("2026-10-12T03:00:00.000Z"));
    const second = registerDocumentPath("REG-261012-0002", 2, new Date("2026-10-12T03:00:00.000Z"));
    expect(first).not.toBe(second);
  });
});
