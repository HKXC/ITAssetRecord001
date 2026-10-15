import { redirect } from "next/navigation";

import { AuthBackground } from "@/app/(auth)/login/AuthBackground";
import { LoginForm } from "@/app/(auth)/login/LoginForm";
import { BrandLockup } from "@/components/common/BrandLogo";
import { getCurrentUser } from "@/lib/supabase/server";

export const instant = false;

export const metadata = { title: "เข้าสู่ระบบ | ระบบบริหารจัดการครุภัณฑ์ IT" };

/**
 * Every string here describes a capability that exists in the codebase: registration and
 * search live in src/lib/services/assets.ts, document revisions in documents.ts (the
 * unique document_number + revision pair in the schema), PDF export in pdf/. No
 * certifications, uptime figures or testimonials — those would be invented claims.
 */
export default async function LoginPage() {
  // Already signed in — go straight to the dashboard.
  const user = await getCurrentUser().catch(() => null);
  if (user) redirect("/");

  return (
    <div className="auth-shell">
      <AuthBackground />

      {/* Brand column — hidden below md, where the form takes the full width. */}
      <aside className="auth-brand">
        <div className="auth-brand-logo">
          <BrandLockup />
        </div>

        <div className="auth-brand-body">
          <span className="auth-pill">
            <span className="auth-pill-dot" aria-hidden />
            <span>IT Asset Management System</span>
          </span>

          <h2 className="auth-headline">
            จัดการครุภัณฑ์ไอที
            <br />
            <em>ตั้งแต่ลงทะเบียน</em>
            <br />
            จนถึงเอกสาร PDF
          </h2>

          <p className="auth-lede">
            ขึ้นทะเบียนครุภัณฑ์ ค้นหาและกรองตามหน่วยงานหรือสถานะ
            ดูประวัติเอกสารฉบับก่อนหน้า และสร้างเอกสาร PDF พร้อมใช้งานได้ในที่เดียว
          </p>

          <div className="auth-stats">
            <div className="auth-stat">
              <span className="auth-stat-value">ทะเบียนครุภัณฑ์</span>
              <span className="auth-stat-label">Asset Register</span>
            </div>
            <div className="auth-stat">
              <span className="auth-stat-value">ประวัติเอกสาร</span>
              <span className="auth-stat-label">Revision History</span>
            </div>
            <div className="auth-stat">
              <span className="auth-stat-value">ค้นหาและกรอง</span>
              <span className="auth-stat-label">Search &amp; Filter</span>
            </div>
          </div>
        </div>

        <div className="auth-brand-footer">
          <span>© 2026 ฝ่ายเทคโนโลยีสารสนเทศ</span>
          <span>ระบบใช้งานภายในองค์กร</span>
        </div>
      </aside>

      {/* Form column */}
      <main className="auth-main">
        <div className="auth-form">
          <div className="auth-form-logo">
            <BrandLockup />
          </div>

          <h1 className="auth-title">ยินดีต้อนรับกลับมา</h1>
          <p className="auth-subtitle">เข้าสู่ระบบเพื่อจัดการทะเบียนครุภัณฑ์</p>

          <div className="auth-card">
            <LoginForm />
          </div>

          <p className="auth-footnote">
            ระบบนี้ใช้งานภายในองค์กร
            <br />
            กรุณาติดต่อผู้ดูแลระบบหากเข้าใช้งานไม่ได้
          </p>
        </div>
      </main>
    </div>
  );
}
