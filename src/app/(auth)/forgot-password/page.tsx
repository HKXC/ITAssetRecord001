import { ForgotPasswordForm } from "@/app/(auth)/forgot-password/ForgotPasswordForm";
import { AuthBackground } from "@/app/(auth)/login/AuthBackground";
import { BrandLockup } from "@/components/common/BrandLogo";

export const instant = false;

export const metadata = { title: "ลืมรหัสผ่าน | ระบบบริหารจัดการครุภัณฑ์ IT" };

/**
 * Failure reasons the callback route can send back. Both are phrased as things the user
 * can act on, and neither reveals whether an account exists.
 */
const LINK_ERROR_MESSAGES: Record<string, string> = {
  link: "ลิงก์รีเซ็ตรหัสผ่านหมดอายุหรือถูกใช้ไปแล้ว กรุณาขอลิงก์ใหม่",
  session: "เซสชันหมดอายุแล้ว กรุณาขอลิงก์รีเซ็ตรหัสผ่านใหม่",
};

export default async function ForgotPasswordPage({ searchParams }: PageProps<"/forgot-password">) {
  const params = await searchParams;
  const rawError = typeof params.error === "string" ? params.error : undefined;
  const linkError = rawError ? (LINK_ERROR_MESSAGES[rawError] ?? LINK_ERROR_MESSAGES.link) : null;

  return (
    <div className="auth-centered">
      <AuthBackground />

      <div className="auth-form">
        <div className="auth-form-logo">
          <BrandLockup />
        </div>

        <h1 className="auth-title">ลืมรหัสผ่าน?</h1>
        <p className="auth-subtitle">
          กรอกอีเมลของคุณ แล้วเราจะส่งลิงก์สำหรับตั้งรหัสผ่านใหม่ให้
        </p>

        <div className="auth-card">
          <ForgotPasswordForm linkError={linkError} />
        </div>

        <p className="auth-footnote">
          ไม่ได้รับอีเมลภายในไม่กี่นาที กรุณาตรวจสอบโฟลเดอร์สแปม
          <br />
          หรือติดต่อผู้ดูแลระบบโดยตรง
        </p>
      </div>
    </div>
  );
}
