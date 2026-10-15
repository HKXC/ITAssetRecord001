import { z } from "zod";

import { fieldErrors, formDataToObject } from "@/lib/validation/common";

/**
 * Validation for the public auth forms.
 *
 * Follows the same shape as parseAssetForm: one Zod schema serves both the browser form
 * and the Server Action, so the inline messages a user sees can never drift from what the
 * action actually enforces. Messages are Thai via fieldErrors().
 *
 * Scope note: `signInSchema` is used for *client-side* convenience only. `signInAction`
 * keeps its own generic, deliberately non-specific check — distinguishing an unknown
 * account from a bad password would help an attacker, and that behaviour is not changed
 * here. Client checks may be stricter than the server; never weaker.
 */

/**
 * Deliberately loose: only "obviously malformed" is rejected, never "unusual".
 *
 * Requiring a dot in the domain would reject legitimate addresses such as
 * it-team@localhost on an *internal* mail server. On a sign-in form a false negative
 * locks a real user out of their own account, so the check stays permissive and lets
 * GoTrue be the authority on anything it would actually accept.
 */
export const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+$/;

export const PASSWORD_MIN_LENGTH = 8;

export const AUTH_FIELD_LABELS: Record<string, string> = {
  email: "อีเมล",
  password: "รหัสผ่าน",
  password_confirmation: "ยืนยันรหัสผ่าน",
};

const asTrimmedString = (value: unknown) => (typeof value === "string" ? value.trim() : "");

/** Passwords are never trimmed: leading/trailing spaces are legal and significant. */
const rawString = (value: unknown) => (typeof value === "string" ? value : "");

const emailField = z.preprocess(
  asTrimmedString,
  z
    .string()
    .min(1, "กรุณากรอกอีเมล")
    .regex(EMAIL_PATTERN, "รูปแบบอีเมลไม่ถูกต้อง"),
);

export const signInSchema = z.object({
  email: emailField,
  password: z.preprocess(rawString, z.string().min(1, "กรุณากรอกรหัสผ่าน")),
});

export type SignInFormInput = z.infer<typeof signInSchema>;

export function parseSignInForm(formData: FormData) {
  const parsed = signInSchema.safeParse(formDataToObject(formData));
  return parsed.success
    ? { ok: true as const, data: parsed.data }
    : { ok: false as const, errors: fieldErrors(parsed.error, AUTH_FIELD_LABELS) };
}

/** Step 1 — request the recovery email. */
export const passwordResetRequestSchema = z.object({ email: emailField });

export type PasswordResetRequestInput = z.infer<typeof passwordResetRequestSchema>;

export function parsePasswordResetRequest(formData: FormData) {
  const parsed = passwordResetRequestSchema.safeParse(formDataToObject(formData));
  return parsed.success
    ? { ok: true as const, data: parsed.data }
    : { ok: false as const, errors: fieldErrors(parsed.error, AUTH_FIELD_LABELS) };
}

/**
 * Step 2 — set the new password.
 *
 * 8 characters is a policy for *setting* a password, not a claim about existing ones:
 * GoTrue remains the authority and its own answer is surfaced unchanged if it disagrees.
 */
export const updatePasswordSchema = z
  .object({
    password: z.preprocess(
      rawString,
      z
        .string()
        .min(1, "กรุณากรอกรหัสผ่านใหม่")
        .min(PASSWORD_MIN_LENGTH, `รหัสผ่านต้องมีอย่างน้อย ${PASSWORD_MIN_LENGTH} ตัวอักษร`),
    ),
    password_confirmation: z.preprocess(rawString, z.string().min(1, "กรุณากรอกรหัสผ่านยืนยัน")),
  })
  .refine((value) => value.password === value.password_confirmation, {
    message: "รหัสผ่านทั้งสองช่องไม่ตรงกัน",
    path: ["password_confirmation"],
  });

export type UpdatePasswordInput = z.infer<typeof updatePasswordSchema>;

export function parseUpdatePassword(formData: FormData) {
  const parsed = updatePasswordSchema.safeParse(formDataToObject(formData));
  return parsed.success
    ? { ok: true as const, data: parsed.data }
    : { ok: false as const, errors: fieldErrors(parsed.error, AUTH_FIELD_LABELS) };
}
