import { describe, expect, it } from "vitest";

import {
  parsePasswordResetRequest,
  parseSignInForm,
  parseUpdatePassword,
  PASSWORD_MIN_LENGTH,
} from "@/lib/validation/auth";

function signInForm(overrides: Record<string, string> = {}): FormData {
  const form = new FormData();
  const values: Record<string, string> = {
    email: "admin@example.com",
    password: "Sup3rSecret!",
    ...overrides,
  };
  for (const [key, value] of Object.entries(values)) form.set(key, value);
  return form;
}

function resetForm(email = "admin@example.com"): FormData {
  const form = new FormData();
  form.set("email", email);
  return form;
}

function passwordForm(overrides: Record<string, string> = {}): FormData {
  const form = new FormData();
  const values: Record<string, string> = {
    password: "a-long-enough-passphrase",
    password_confirmation: "a-long-enough-passphrase",
    ...overrides,
  };
  for (const [key, value] of Object.entries(values)) form.set(key, value);
  return form;
}

describe("sign-in form", () => {
  it("accepts a valid email and password, trimming only the email", () => {
    const result = parseSignInForm(signInForm({ email: "  admin@example.com  " }));
    expect(result.ok).toBe(true);
    if (!result.ok) return;

    expect(result.data.email).toBe("admin@example.com");
    expect(result.data.password).toBe("Sup3rSecret!");
  });

  it("requires both fields with Thai messages", () => {
    const result = parseSignInForm(signInForm({ email: "", password: "" }));
    expect(result.ok).toBe(false);
    if (result.ok) return;

    expect(result.errors.email).toContain("กรุณากรอกอีเมล");
    expect(result.errors.password).toContain("กรุณากรอกรหัสผ่าน");
  });

  it("rejects a malformed email with a Thai message", () => {
    const result = parseSignInForm(signInForm({ email: "not-an-email" }));
    expect(result.ok).toBe(false);
    if (result.ok) return;

    expect(result.errors.email).toContain("รูปแบบอีเมลไม่ถูกต้อง");
  });

  it("accepts addresses that are valid but unusual", () => {
    for (const email of ["admin+it@dept.co.th", "a.b@sub.example.org", "it-team@localhost"]) {
      const result = parseSignInForm(signInForm({ email }));
      expect(result.ok, `expected ${email} to be accepted`).toBe(true);
    }
  });

  it("does not trim the password — leading and trailing spaces are significant", () => {
    const result = parseSignInForm(signInForm({ password: "  spaced-out  " }));
    expect(result.ok).toBe(true);
    if (!result.ok) return;

    expect(result.data.password).toBe("  spaced-out  ");
  });
});

describe("password reset request", () => {
  it("applies exactly the same email rules as sign-in", () => {
    expect(parsePasswordResetRequest(resetForm("admin@example.com")).ok).toBe(true);
    expect(parsePasswordResetRequest(resetForm(" admin@example.com ")).ok).toBe(true);

    const missing = parsePasswordResetRequest(resetForm(""));
    expect(missing.ok).toBe(false);
    if (!missing.ok) expect(missing.errors.email).toContain("กรุณากรอกอีเมล");

    const malformed = parsePasswordResetRequest(resetForm("nope"));
    expect(malformed.ok).toBe(false);
    if (!malformed.ok) expect(malformed.errors.email).toContain("รูปแบบอีเมลไม่ถูกต้อง");
  });
});

describe("update password", () => {
  it("uses the documented minimum length policy", () => {
    expect(PASSWORD_MIN_LENGTH).toBe(8);
  });

  it("accepts a matching password at or above the minimum", () => {
    expect(parseUpdatePassword(passwordForm()).ok).toBe(true);
    expect(
      parseUpdatePassword(passwordForm({ password: "12345678", password_confirmation: "12345678" }))
        .ok,
    ).toBe(true);
  });

  it("reports an empty password distinctly from a short one", () => {
    const empty = parseUpdatePassword(passwordForm({ password: "", password_confirmation: "" }));
    expect(empty.ok).toBe(false);
    if (!empty.ok) expect(empty.errors.password).toContain("กรุณากรอกรหัสผ่านใหม่");

    const short = parseUpdatePassword(passwordForm({ password: "abc", password_confirmation: "abc" }));
    expect(short.ok).toBe(false);
    if (!short.ok) expect(short.errors.password).toContain(String(PASSWORD_MIN_LENGTH));
  });

  it("rejects mismatched confirmation with a Thai message", () => {
    const result = parseUpdatePassword(
      passwordForm({ password_confirmation: "a-different-passphrase" }),
    );
    expect(result.ok).toBe(false);
    if (result.ok) return;

    expect(result.errors.password_confirmation).toContain("ไม่ตรงกัน");
  });

  it("rejects a blank confirmation field", () => {
    const result = parseUpdatePassword(passwordForm({ password_confirmation: "" }));
    expect(result.ok).toBe(false);
    if (result.ok) return;

    expect(result.errors.password_confirmation).toContain("ยืนยัน");
  });
});
