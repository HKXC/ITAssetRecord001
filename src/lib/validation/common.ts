import { z } from "zod";

/**
 * Shared validation primitives.
 *
 * The same schemas validate the browser form and the Server Action, so client-side
 * convenience checks can never drift from what actually reaches the database.
 *
 * Every helper accepts raw FormData values (strings, or undefined for absent fields)
 * and normalises them before validation, which keeps messages in Thai instead of
 * surfacing framework defaults such as "expected string, received undefined".
 */

export const TEXT_LIMITS = {
  code: 32,
  short: 120,
  medium: 150,
  long: 2000,
} as const;

/** Collects string entries from a FormData object. */
export function formDataToObject(formData: FormData): Record<string, string> {
  const result: Record<string, string> = {};
  for (const [key, value] of formData.entries()) {
    if (typeof value === "string") result[key] = value;
  }
  return result;
}

const asTrimmedString = (value: unknown) => (typeof value === "string" ? value.trim() : "");

export const requiredText = (max: number, label: string) =>
  z.preprocess(
    asTrimmedString,
    z.string().min(1, `กรุณากรอก${label}`).max(max, `${label} ยาวเกิน ${max} ตัวอักษร`),
  );

/** Optional text: whitespace-only input becomes NULL rather than an empty string. */
export const optionalText = (max: number, label: string) =>
  z.preprocess(
    asTrimmedString,
    z
      .string()
      .max(max, `${label} ยาวเกิน ${max} ตัวอักษร`)
      .transform((value) => (value === "" ? null : value)),
  );

/** True only for real calendar dates (rejects 2026-02-30 and 2026-13-01). */
export function isRealCalendarDate(value: string): boolean {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!match) return false;

  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const date = new Date(Date.UTC(year, month - 1, day));

  return (
    date.getUTCFullYear() === year && date.getUTCMonth() === month - 1 && date.getUTCDate() === day
  );
}

/** Optional ISO date (YYYY-MM-DD). Empty input becomes NULL; impossible dates are rejected. */
export const optionalIsoDate = (label: string) =>
  z.preprocess(
    asTrimmedString,
    z
      .string()
      .or(z.literal(""))
      .refine(
        (value) => value === "" || isRealCalendarDate(value),
        `${label} ต้องเป็นวันที่จริงในรูปแบบ ปี-เดือน-วัน (YYYY-MM-DD)`,
      )
      .transform((value) => (value === "" ? null : value)),
  );

/** Coerces a form value to a number, treating an empty field as 0 so `.positive()` fires. */
const asNumber = (value: unknown) => {
  if (typeof value === "string" && value.trim() === "") return 0;
  if (value === undefined || value === null) return 0;
  return value;
};

export const requiredPositiveInt = (label: string) =>
  z.preprocess(asNumber, z.coerce.number().int().positive(label));

export const optionalInt = (label: string) =>
  z.preprocess(
    (value) => (value === undefined || value === null || value === "" ? undefined : value),
    z.coerce.number().int(`${label} ต้องเป็นตัวเลข`).positive(`${label} ต้องมากกว่า 0`).optional(),
  );

export const booleanish = (value: unknown) =>
  value === true || value === "true" || value === "on" || value === "1";

/**
 * Turns Zod issues into Thai per-field messages.
 *
 * Any message that arrives without Thai characters is a framework default (for example
 * "Invalid option"), so it is replaced with a generic Thai message for that field. This
 * keeps the UI consistently Thai without suppressing real validation failures.
 */
export function fieldErrors(
  error: z.ZodError,
  labels: Record<string, string> = {},
): Record<string, string> {
  const result: Record<string, string> = {};

  for (const issue of error.issues) {
    const key = issue.path.map(String).join(".") || "_form";
    if (result[key]) continue;

    const hasThai = /[\u0E00-\u0E7F]/.test(issue.message);
    result[key] = hasThai
      ? issue.message
      : `${labels[key] ?? "ข้อมูล"}ไม่ถูกต้องหรือไม่ครบถ้วน`;
  }

  return result;
}
