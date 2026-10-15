"use client";

import { useActionState, useState } from "react";
import Link from "next/link";

import { updatePasswordAction, type UpdatePasswordState } from "@/app/(auth)/actions";
import { Alert } from "@/components/common/Alert";
import { Field, TextInput } from "@/components/common/Field";
import { SubmitButton } from "@/components/common/SubmitButton";
import { parseUpdatePassword, PASSWORD_MIN_LENGTH } from "@/lib/validation/auth";

const initialState: UpdatePasswordState = { error: null };

type FieldErrors = Record<string, string | undefined>;
type ResetFieldName = "password" | "password_confirmation";

/** Blur validation reads the live form off the event target — no ref touched at render. */
function blurError(input: HTMLInputElement, name: ResetFieldName): string | undefined {
  if (!input.form) return undefined;
  const result = parseUpdatePassword(new FormData(input.form));
  return result.ok ? undefined : result.errors[name];
}

export function ResetPasswordForm({ email }: { email: string | null }) {
  const [state, formAction] = useActionState(updatePasswordAction, initialState);
  const [errors, setErrors] = useState<FieldErrors>({});

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    const result = parseUpdatePassword(new FormData(event.currentTarget));
    if (result.ok) {
      setErrors({});
      return;
    }
    setErrors(result.errors);
    event.preventDefault();
  }

  const handleBlur = (name: ResetFieldName) => (event: React.FocusEvent<HTMLInputElement>) => {
    const input = event.currentTarget;
    setErrors((previous) => ({ ...previous, [name]: blurError(input, name) }));
  };

  const clearField = (name: ResetFieldName) => () =>
    setErrors((previous) => ({ ...previous, [name]: undefined }));

  return (
    <form action={formAction} noValidate onSubmit={handleSubmit} className="flex flex-col gap-4">
      {state.error ? <Alert tone="error" role="alert">{state.error}</Alert> : null}

      <Field
        label="รหัสผ่านใหม่"
        htmlFor="password"
        required
        error={errors.password}
        hint={`อย่างน้อย ${PASSWORD_MIN_LENGTH} ตัวอักษร`}
      >
        <TextInput
          id="password"
          name="password"
          type="password"
          autoComplete="new-password"
          required
          className="auth-field-input"
          invalid={Boolean(errors.password)}
          onBlur={handleBlur("password")}
          onFocus={clearField("password")}
        />
      </Field>

      <Field
        label="ยืนยันรหัสผ่าน"
        htmlFor="password_confirmation"
        required
        error={errors.password_confirmation}
      >
        <TextInput
          id="password_confirmation"
          name="password_confirmation"
          type="password"
          autoComplete="new-password"
          required
          className="auth-field-input"
          invalid={Boolean(errors.password_confirmation)}
          onBlur={handleBlur("password_confirmation")}
          onFocus={clearField("password_confirmation")}
        />
      </Field>

      <SubmitButton pendingLabel="กำลังบันทึก…" className="auth-submit">
        บันทึกรหัสผ่านใหม่
      </SubmitButton>

      {email ? (
        <p className="text-center text-xs text-muted">กำลังตั้งรหัสผ่านใหม่สำหรับ {email}</p>
      ) : null}

      <p className="text-center text-xs text-muted">
        <Link href="/login" className="auth-link">
          ← กลับไปหน้าเข้าสู่ระบบ
        </Link>
      </p>
    </form>
  );
}
