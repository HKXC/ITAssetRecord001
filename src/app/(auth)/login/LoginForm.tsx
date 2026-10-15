"use client";

import { useActionState, useState } from "react";
import Link from "next/link";

import { signInAction, type SignInState } from "@/app/(auth)/actions";
import { Alert } from "@/components/common/Alert";
import { Field, TextInput } from "@/components/common/Field";
import { SubmitButton } from "@/components/common/SubmitButton";
import { parseSignInForm } from "@/lib/validation/auth";

const initialState: SignInState = { error: null };

type FieldErrors = Record<string, string | undefined>;
type SignInFieldName = "email" | "password";

/**
 * Blur validation reads the live form off the event target rather than a ref, so no ref
 * value is touched while rendering. Only the field that actually blurred is reported,
 * which keeps untouched fields quiet until the user tabs away from them.
 */
function blurError(input: HTMLInputElement, name: SignInFieldName): string | undefined {
  if (!input.form) return undefined;
  const result = parseSignInForm(new FormData(input.form));
  return result.ok ? undefined : result.errors[name];
}

function EyeIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  );
}

function EyeOffIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
      <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19M1 1l22 22" />
    </svg>
  );
}

export function LoginForm() {
  const [state, formAction] = useActionState(signInAction, initialState);
  const [showPassword, setShowPassword] = useState(false);
  const [errors, setErrors] = useState<FieldErrors>({});

  /**
   * Client-side validation is a courtesy, never the authority: `signInAction` re-checks
   * both fields and owns every user-visible message about authentication. If React ever
   * dispatched past this guard, the form would still fail safely with a Thai message
   * rather than misbehave.
   */
  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    const result = parseSignInForm(new FormData(event.currentTarget));
    if (result.ok) {
      setErrors({});
      return;
    }
    setErrors(result.errors);
    event.preventDefault();
  }

  const handleBlur = (name: SignInFieldName) => (event: React.FocusEvent<HTMLInputElement>) => {
    const input = event.currentTarget;
    setErrors((previous) => ({ ...previous, [name]: blurError(input, name) }));
  };

  const clearField = (name: SignInFieldName) => () =>
    setErrors((previous) => ({ ...previous, [name]: undefined }));

  return (
    <form action={formAction} noValidate onSubmit={handleSubmit} className="flex flex-col gap-4">
      {state.error ? <Alert tone="error" role="alert">{state.error}</Alert> : null}

      <Field label="อีเมล" htmlFor="email" required error={errors.email}>
        <TextInput
          id="email"
          name="email"
          type="email"
          autoComplete="username"
          required
          placeholder="admin@example.com"
          className="auth-field-input"
          invalid={Boolean(errors.email)}
          onBlur={handleBlur("email")}
          onFocus={clearField("email")}
        />
      </Field>

      <Field label="รหัสผ่าน" htmlFor="password" required error={errors.password}>
        <div className="auth-password-field">
          <TextInput
            id="password"
            name="password"
            type={showPassword ? "text" : "password"}
            autoComplete="current-password"
            required
            className="auth-field-input"
            invalid={Boolean(errors.password)}
            onBlur={handleBlur("password")}
            onFocus={clearField("password")}
          />
          <button
            type="button"
            className="auth-password-toggle"
            onClick={() => setShowPassword((visible) => !visible)}
            aria-label={showPassword ? "ซ่อนรหัสผ่าน" : "แสดงรหัสผ่าน"}
            aria-pressed={showPassword}
            title={showPassword ? "ซ่อนรหัสผ่าน" : "แสดงรหัสผ่าน"}
          >
            {showPassword ? <EyeOffIcon /> : <EyeIcon />}
          </button>
        </div>
      </Field>

      <div className="auth-link-row">
        <Link href="/forgot-password" className="auth-link">
          ลืมรหัสผ่าน?
        </Link>
      </div>

      <SubmitButton pendingLabel="กำลังเข้าสู่ระบบ…" className="auth-submit">
        เข้าสู่ระบบ
      </SubmitButton>
    </form>
  );
}
