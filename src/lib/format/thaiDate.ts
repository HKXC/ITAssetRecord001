/**
 * Thai date formatting.
 *
 * Rules agreed for this system:
 *   - the database always stores ISO / Gregorian values (date and timestamptz);
 *   - documents and screens display พ.ศ. (Buddhist Era) with Thai month names.
 *
 * Display conversions happen in the APP_TIMEZONE (default Asia/Bangkok) so a timestamp
 * stored in UTC lands on the correct Thai calendar day.
 */

export const THAI_MONTHS_FULL = [
  "มกราคม",
  "กุมภาพันธ์",
  "มีนาคม",
  "เมษายน",
  "พฤษภาคม",
  "มิถุนายน",
  "กรกฎาคม",
  "สิงหาคม",
  "กันยายน",
  "ตุลาคม",
  "พฤศจิกายน",
  "ธันวาคม",
] as const;

export const THAI_MONTHS_SHORT = [
  "ม.ค.",
  "ก.พ.",
  "มี.ค.",
  "เม.ย.",
  "พ.ค.",
  "มิ.ย.",
  "ก.ค.",
  "ส.ค.",
  "ก.ย.",
  "ต.ค.",
  "พ.ย.",
  "ธ.ค.",
] as const;

/** Gregorian → Buddhist Era. */
export const BUDDHIST_ERA_OFFSET = 543;

export function toBuddhistYear(gregorianYear: number): number {
  return gregorianYear + BUDDHIST_ERA_OFFSET;
}

export function toGregorianYear(buddhistYear: number): number {
  return buddhistYear - BUDDHIST_ERA_OFFSET;
}

const DATE_ONLY = /^\d{4}-\d{2}-\d{2}$/;

type CalendarParts = {
  year: number;
  month: number; // 1-12
  day: number;
  hour: number;
  minute: number;
};

function displayTimeZone(): string {
  return process.env.APP_TIMEZONE ?? "Asia/Bangkok";
}

/**
 * Splits a value into calendar parts.
 *
 * A date-only string is taken literally (a "2026-10-12" acquisition date must not shift
 * days when the viewer is west of UTC). A timestamp is converted to the display zone.
 */
export function calendarParts(value: string | Date): CalendarParts {
  if (typeof value === "string" && DATE_ONLY.test(value)) {
    const [year, month, day] = value.split("-").map(Number);
    assertValidDate(year, month, day, value);
    return { year, month, day, hour: 0, minute: 0 };
  }

  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) {
    throw new TypeError(`รูปแบบวันที่ไม่ถูกต้อง: ${String(value)}`);
  }

  const formatter = new Intl.DateTimeFormat("en-GB", {
    timeZone: displayTimeZone(),
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });

  const parts = new Map(formatter.formatToParts(date).map((part) => [part.type, part.value]));
  return {
    year: Number(parts.get("year")),
    month: Number(parts.get("month")),
    day: Number(parts.get("day")),
    hour: Number(parts.get("hour")),
    minute: Number(parts.get("minute")),
  };
}

function assertValidDate(year: number, month: number, day: number, source: string) {
  const date = new Date(Date.UTC(year, month - 1, day));
  const ok =
    date.getUTCFullYear() === year && date.getUTCMonth() === month - 1 && date.getUTCDate() === day;
  if (!ok) throw new TypeError(`วันที่ไม่มีอยู่จริง: ${source}`);
}

const EMPTY = "—";

/** "12 ตุลาคม 2569" (พ.ศ.) — the format used on generated PDFs. */
export function formatThaiDate(
  value: string | Date | null | undefined,
  options: { short?: boolean } = {},
): string {
  if (value === null || value === undefined || value === "") return EMPTY;

  const { year, month, day } = calendarParts(value);
  const monthName = options.short ? THAI_MONTHS_SHORT[month - 1] : THAI_MONTHS_FULL[month - 1];
  return `${day} ${monthName} ${toBuddhistYear(year)}`;
}

/** "12 ตุลาคม 2569 เวลา 14:05" — used for generation timestamps. */
export function formatThaiDateTime(
  value: string | Date | null | undefined,
  options: { short?: boolean } = {},
): string {
  if (value === null || value === undefined || value === "") return EMPTY;

  const { hour, minute } = calendarParts(value);
  const time = `${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}`;
  return `${formatThaiDate(value, options)} เวลา ${time}`;
}

/** ISO date (YYYY-MM-DD) for database writes. */
export function toIsoDateString(value: Date): string {
  const year = value.getUTCFullYear();
  const month = String(value.getUTCMonth() + 1).padStart(2, "0");
  const day = String(value.getUTCDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}
