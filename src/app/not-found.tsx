import Link from "next/link";

export default function NotFound() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-surface px-4">
      <div className="card max-w-md p-6 text-center">
        <p className="text-lg font-semibold">ไม่พบหน้าที่ต้องการ</p>
        <p className="mt-2 text-sm text-muted">
          ข้อมูลอาจถูกลบไปแล้ว หรือลิงก์ไม่ถูกต้อง กรุณากลับไปยังหน้าทะเบียนครุภัณฑ์
        </p>
        <Link
          href="/assets"
          className="mt-4 inline-flex rounded-md border border-primary bg-primary px-4 py-2 text-sm font-medium text-on-primary hover:bg-primary-hover"
        >
          ไปยังทะเบียนครุภัณฑ์
        </Link>
      </div>
    </div>
  );
}
