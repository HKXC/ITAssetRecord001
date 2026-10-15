import { describe, expect, it } from "vitest";

import {
  calendarParts,
  formatThaiDate,
  formatThaiDateTime,
  toBuddhistYear,
  toGregorianYear,
  toIsoDateString,
} from "@/lib/format/thaiDate";

describe("Buddhist era conversion", () => {
  it("adds and removes the 543-year offset", () => {
    expect(toBuddhistYear(2026)).toBe(2569);
    expect(toGregorianYear(2569)).toBe(2026);
    expect(toBuddhistYear(toGregorianYear(2500))).toBe(2500);
  });
});

describe("formatThaiDate", () => {
  it("formats a date-only value without timezone drift", () => {
    expect(formatThaiDate("2026-10-12")).toBe("12 ตุลาคม 2569");
    expect(formatThaiDate("2024-05-17")).toBe("17 พฤษภาคม 2567");
  });

  it("uses Thai abbreviations when asked", () => {
    expect(formatThaiDate("2026-10-12", { short: true })).toBe("12 ต.ค. 2569");
    expect(formatThaiDate("2026-01-01", { short: true })).toBe("1 ม.ค. 2569");
  });

  it("handles the year boundary in both directions", () => {
    expect(formatThaiDate("2026-12-31")).toBe("31 ธันวาคม 2569");
    expect(formatThaiDate("2027-01-01")).toBe("1 มกราคม 2570");
  });

  it("handles leap years", () => {
    expect(formatThaiDate("2028-02-29")).toBe("29 กุมภาพันธ์ 2571");
  });

  it("renders every Thai month name", () => {
    const months = Array.from({ length: 12 }, (_, index) =>
      formatThaiDate(`2026-${String(index + 1).padStart(2, "0")}-01`, { short: true }),
    );
    expect(months).toEqual([
      "1 ม.ค. 2569",
      "1 ก.พ. 2569",
      "1 มี.ค. 2569",
      "1 เม.ย. 2569",
      "1 พ.ค. 2569",
      "1 มิ.ย. 2569",
      "1 ก.ค. 2569",
      "1 ส.ค. 2569",
      "1 ก.ย. 2569",
      "1 ต.ค. 2569",
      "1 พ.ย. 2569",
      "1 ธ.ค. 2569",
    ]);
  });

  it("returns a dash for empty values and rejects invalid ones", () => {
    expect(formatThaiDate(null)).toBe("—");
    expect(formatThaiDate(undefined)).toBe("—");
    expect(() => formatThaiDate("not-a-date")).toThrow(TypeError);
    expect(() => formatThaiDate("2026-02-30")).toThrow(TypeError);
  });

  it("converts timestamps into the Thai calendar day", () => {
    // 2026-10-12T20:00Z is 03:00 on 13 October in Asia/Bangkok (UTC+7).
    expect(formatThaiDate("2026-10-12T20:00:00.000Z")).toBe("13 ตุลาคม 2569");
  });
});

describe("formatThaiDateTime", () => {
  it("includes the time in the display timezone", () => {
    expect(formatThaiDateTime("2026-10-12T03:00:00.000Z")).toBe("12 ตุลาคม 2569 เวลา 10:00");
  });

  it("returns a dash for null", () => {
    expect(formatThaiDateTime(null)).toBe("—");
  });
});

describe("calendarParts", () => {
  it("takes a date-only string literally regardless of timezone", () => {
    expect(calendarParts("2024-05-17")).toEqual({ year: 2024, month: 5, day: 17, hour: 0, minute: 0 });
  });

  it("formats a Date in the display timezone", () => {
    const parts = calendarParts(new Date("2026-10-12T20:30:00.000Z"));
    expect(parts.year).toBe(2026);
    expect(parts.month).toBe(10);
    expect(parts.day).toBe(13);
    expect(parts.hour).toBe(3);
    expect(parts.minute).toBe(30);
  });
});

describe("toIsoDateString", () => {
  it("formats a Date as YYYY-MM-DD", () => {
    expect(toIsoDateString(new Date("2026-10-12T00:00:00.000Z"))).toBe("2026-10-12");
  });
});
