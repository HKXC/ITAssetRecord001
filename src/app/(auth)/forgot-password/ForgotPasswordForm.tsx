"use client";

import { useActionState, useState } from "react";
import Link from "next/link";

import {
  requestPasswordResetAction,
  type PasswordResetRequestState,
} from "@/app/(auth)/actions";
import { Alert } from "@/components/common/Alert";
import { Field, TextInput } from "@/components/common/Field";
import { SubmitButton } from "@/components/common/SubmitButton";
import { parsePasswordResetRequest } from "@/lib/validation/auth";

const initialState: PasswordResetRequestState = { error: null, sent: false };

type FieldErrors = Record<string, string | undefined>;

/** Blur validation reads the live form off the event target — no ref touched at render. */
function blurError(input: HTMLInputElement): string | undefined {
  if (!input.form) return undefined;
  const result = parsePasswordResetRequest(new FormData(input.form));
  return result.ok ? undefined : result.errors.email;
}

export function ForgotPasswordForm({ linkError }: { linkError?: string | null }) {
  const [state, formAction] = useActionState(requestPasswordResetAction, initialState);
  const [errors, setErrors] = useState<FieldErrors>({});

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    const result = parsePasswordResetRequest(new FormData(event.currentTarget));
    if (result.ok) {
      setErrors({});
      return;
    }
    setErrors(result.errors);
    event.preventDefault();
  }

  const handleBlur = (event: React.FocusEvent<HTMLInputElement>) => {
    const input = event.currentTarget;
    setErrors((previous) => ({ ...previous, email: blurError(input) }));
  };

  return (
    <form action={formAction} noValidate onSubmit={handleSubmit} className="flex flex-col gap-4">
      {linkError ? <Alert tone="error" role="alert">{linkError}</Alert> : null}
      {state.error ? <Alert tone="error" role="alert">{state.error}</Alert> : null}
      {state.sent ? (
        <Alert tone="success" role="status">
          หากอีเมลตรงกับบัญชีในระบบ เราได้ส่งลิงก์ตั้งรหัสผ่านใหม่ให้แล้ว
          หากยังไม่พบ กรุณาตรวจสอบโฟลเดอร์สแปม
        </Alert>
      ) : null}

      <Field label="อีเมล" htmlFor="email" required error={errors.email}>
        <TextInput
          id="email"
          name="email"
          type="email"
          autoComplete="username"
          required
          placeholder="you@company.com"
          className="auth-field-input"
          invalid={Boolean(errors.email)}
          onBlur={handleBlur}
          onFocus={() => setErrors((previous) => ({ ...previous, email: undefined }))}
        />
      </Field>

      <SubmitButton pendingLabel="กำลังส่งอีเมล…" className="auth-submit">
        ส่งลิงก์รีเซ็ตรหัสผ่าน
      </SubmitButton>

      <p className="text-center text-xs text-muted">
        <Link href="/login" className="auth-link">
          ← กลับไปหน้าเข้าสู่ระบบ
        </Link>
      </p>
    </form>
  );
}
