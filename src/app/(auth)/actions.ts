"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { publicEnv } from "@/env";
import { createServerSupabaseClient } from "@/lib/supabase/server";

export type SignInState = { error: string | null };

/**
 * Single-admin sign-in.
 *
 * Messages are intentionally generic: distinguishing "unknown user" from "wrong password"
 * would help an attacker, and there is only one account to guess.
 */
export async function signInAction(_prevState: SignInState, formData: FormData): Promise<SignInState> {
  const email = String(formData.get("email") ?? "").trim();
  const password = String(formData.get("password") ?? "");

  if (!email || !password) {
    return { error: "กรุณากรอกอีเมลและรหัสผ่าน" };
  }

  const supabase = await createServerSupabaseClient();
  const { error } = await supabase.auth.signInWithPassword({ email, password });

  if (error) {
    console.error("[auth] sign-in failed", error.status, error.message);
    return { error: "อีเมลหรือรหัสผ่านไม่ถูกต้อง" };
  }

  revalidatePath("/", "layout");
  redirect("/");
}

export async function signOutAction(): Promise<void> {
  const supabase = await createServerSupabaseClient();
  await supabase.auth.signOut();
  revalidatePath("/", "layout");
  redirect("/login");
}

export type PasswordResetRequestState = { error: string | null; sent: boolean };

/**
 * Step 1 of password recovery: email the link.
 *
 * The reply deliberately does not depend on whether the address exists — disclosing that
 * would turn this endpoint into an account-existence oracle. Failures are logged with
 * their real cause and answered with a service-level message instead.
 *
 * `redirectTo` is kept free of app-managed query parameters on purpose: Supabase
 * validates it against the allow-list in supabase/config.toml and appends its own
 * PKCE `flowId`, so only the path needs registering.
 */
export async function requestPasswordResetAction(
  _prevState: PasswordResetRequestState,
  formData: FormData,
): Promise<PasswordResetRequestState> {
  const email = String(formData.get("email") ?? "").trim();

  if (!email) return { error: "กรุณากรอกอีเมล", sent: false };
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return { error: "รูปแบบอีเมลไม่ถูกต้อง", sent: false };
  }

  try {
    const supabase = await createServerSupabaseClient();
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${publicEnv().appUrl}/auth/callback`,
    });

    if (error) {
      console.error("[auth] password reset request failed", error.status, error.message);
      return {
        error: "ไม่สามารถส่งอีเมลรีเซ็ตรหัสผ่านได้ กรุณาลองใหม่หรือติดต่อผู้ดูแลระบบ",
        sent: false,
      };
    }
  } catch (cause) {
    console.error("[auth] password reset request threw", cause);
    return {
      error: "ไม่สามารถส่งอีเมลรีเซ็ตรหัสผ่านได้ กรุณาลองใหม่หรือติดต่อผู้ดูแลระบบ",
      sent: false,
    };
  }

  return { error: null, sent: true };
}

export type UpdatePasswordState = { error: string | null };

/**
 * Step 2 of password recovery: set the new password.
 *
 * Only runs while a Supabase session exists — the recovery link establishes it through
 * /auth/callback. `updateUser` is the authority on what is acceptable; the checks here
 * only give the user a message before the round-trip.
 */
export async function updatePasswordAction(
  _prevState: UpdatePasswordState,
  formData: FormData,
): Promise<UpdatePasswordState> {
  const password = String(formData.get("password") ?? "");
  const confirmation = String(formData.get("password_confirmation") ?? "");

  if (!password) return { error: "กรุณากรอกรหัสผ่านใหม่" };
  if (password.length < 8) return { error: "รหัสผ่านต้องมีอย่างน้อย 8 ตัวอักษร" };
  if (password !== confirmation) return { error: "รหัสผ่านทั้งสองช่องไม่ตรงกัน" };

  try {
    const supabase = await createServerSupabaseClient();
    const { error } = await supabase.auth.updateUser({ password });

    if (error) {
      console.error("[auth] password update failed", error.status, error.message);
      return { error: "ไม่สามารถเปลี่ยนรหัสผ่านได้ กรุณาขอลิงก์ใหม่" };
    }
  } catch (cause) {
    console.error("[auth] password update threw", cause);
    return { error: "ไม่สามารถเปลี่ยนรหัสผ่านได้ กรุณาขอลิงก์ใหม่" };
  }

  revalidatePath("/", "layout");
  redirect("/");
}
