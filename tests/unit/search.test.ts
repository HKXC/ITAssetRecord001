import { describe, expect, it } from "vitest";

import { escapeSearchTerm } from "@/lib/services/assets";
import { parseAssetSearch } from "@/lib/validation/asset";
import { parseDocumentSearch } from "@/lib/validation/documents";

describe("escapeSearchTerm", () => {
  it("escapes LIKE wildcards so they are matched literally", () => {
    expect(escapeSearchTerm("100%")).toBe("100\\%");
    expect(escapeSearchTerm("UPS_01")).toBe("UPS\\_01");
    expect(escapeSearchTerm("back\\slash")).toBe("back\\\\slash");
  });

  it("removes characters that would break the PostgREST or= filter", () => {
    expect(escapeSearchTerm("a,b")).toBe("a b");
    expect(escapeSearchTerm('say "hi"')).toBe("say  hi ");
    expect(escapeSearchTerm("(test)")).toBe(" test ");
  });

  it("trims surrounding whitespace", () => {
    expect(escapeSearchTerm("  ups-01  ")).toBe("ups-01");
  });
});

describe("parseAssetSearch", () => {
  it("applies defaults for an empty query", () => {
    const parsed = parseAssetSearch({});
    expect(parsed).toMatchObject({
      q: null,
      department: null,
      location: null,
      status: null,
      page: 1,
      per_page: 25,
      sort: "asset_code",
      dir: "asc",
    });
    expect(parsed.asset_type_id).toBeUndefined();
  });

  it("parses a full query string", () => {
    const parsed = parseAssetSearch({
      q: "ups-01",
      asset_type_id: "5",
      department: "ฝ่ายเทคโนโลยีสารสนเทศ",
      status: "active",
      page: "3",
      per_page: "50",
      sort: "asset_name",
      dir: "desc",
    });

    expect(parsed.q).toBe("ups-01");
    expect(parsed.asset_type_id).toBe(5);
    expect(parsed.department).toBe("ฝ่ายเทคโนโลยีสารสนเทศ");
    expect(parsed.status).toBe("active");
    expect(parsed.page).toBe(3);
    expect(parsed.per_page).toBe(50);
    expect(parsed.sort).toBe("asset_name");
    expect(parsed.dir).toBe("desc");
  });

  it("falls back to defaults instead of throwing on invalid input", () => {
    const parsed = parseAssetSearch({
      page: "-5",
      per_page: "9999",
      status: "hacked",
      sort: "drop table assets",
      dir: "sideways",
    });

    expect(parsed.page).toBe(1);
    expect(parsed.per_page).toBe(25);
    expect(parsed.status).toBeNull();
    expect(parsed.sort).toBe("asset_code");
    expect(parsed.dir).toBe("asc");
  });

  it("takes the first value when a parameter repeats", () => {
    expect(parseAssetSearch({ q: ["first", "second"] }).q).toBe("first");
  });
});

describe("parseDocumentSearch", () => {
  it("applies defaults and validates enumerations", () => {
    expect(parseDocumentSearch({})).toMatchObject({
      q: null,
      document_type: null,
      status: null,
      page: 1,
      per_page: 25,
    });

    expect(parseDocumentSearch({ document_type: "register", status: "failed" })).toMatchObject({
      document_type: "register",
      status: "failed",
    });

    expect(parseDocumentSearch({ document_type: "nope", status: "nope" })).toMatchObject({
      document_type: null,
      status: null,
    });
  });
});
