import { redirect } from "next/navigation";

import { AuthBackground } from "@/app/(auth)/login/AuthBackground";
import { ResetPasswordForm } from "@/app/(auth)/reset-password/ResetPasswordForm";
import { BrandLockup } from "@/components/common/BrandLogo";
import { getCurrentUser } from "@/lib/supabase/server";

export const instant = false;

export const metadata = { title: "ตั้งรหัสผ่านใหม่ | ระบบบริหารจัดการครุภัณฑ์ IT" };

/**
 * Reaching this page requires a live Supabase session, which is only established by
 * redeeming the emailed link through /auth/callback. A visitor who opens the URL
 * directly — or whose session expired — is sent back to request a fresh link rather than
 * being shown a form that could never succeed. A missing env configuration is treated the
 * same way, because without it there is no client to talk to.
 */
export default async function ResetPasswordPage() {
  const user = await getCurrentUser().catch(() => null);
  if (!user) redirect("/forgot-password?error=session");

  return (
    <div className="auth-centered">
      <AuthBackground />

      <div className="auth-form">
        <div className="auth-form-logo">
          <BrandLockup />
        </div>

        <h1 className="auth-title">ตั้งรหัสผ่านใหม่</h1>
        <p className="auth-subtitle">รหัสผ่านใหม่จะมีผลทันทีหลังบันทึก</p>

        <div className="auth-card">
          <ResetPasswordForm email={user.email ?? null} />
        </div>
      </div>
    </div>
  );
}
