import { AppShell } from "@/components/layout/AppShell";
import { ButtonLink } from "@/components/common/Button";
import { EmptyState } from "@/components/common/Alert";
import { AssetStatusBadge, DocumentStatusBadge } from "@/components/common/StatusBadge";
import { formatThaiDate } from "@/lib/format/thaiDate";
import { getAssetStats } from "@/lib/services/assets";
import { DOCUMENT_TYPE_LABELS, listDocuments } from "@/lib/services/documents";
import { getCurrentUser } from "@/lib/supabase/server";

export const instant = false;

export const metadata = { title: "ภาพรวม | ระบบบริหารจัดการครุภัณฑ์ IT" };

export default async function DashboardPage() {
  const [user, stats, recentDocuments] = await Promise.all([
    getCurrentUser(),
    getAssetStats(),
    listDocuments({ q: null, documentType: null, status: null, page: 1, perPage: 5 }),
  ]);

  const maxTypeCount = Math.max(1, ...stats.byType.map((row) => row.count));

  return (
    <AppShell
      title="ภาพรวมระบบ"
      description="สรุปจำนวนครุภัณฑ์และเอกสารที่ออกในระบบ"
      userEmail={user?.email ?? null}
      actions={
        <>
          <ButtonLink href="/assets/new" size="sm">
            ลงทะเบียนครุภัณฑ์
          </ButtonLink>
          <ButtonLink href="/assets" variant="secondary" size="sm">
            ดูรายการทั้งหมด
          </ButtonLink>
        </>
      }
    >
      <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="ครุภัณฑ์ทั้งหมด" value={stats.total} unit="รายการ" />
        <StatCard label="เอกสารพร้อมใช้งาน" value={stats.documentsTotal} unit="เอกสาร" />
        <StatCard label="เอกสารที่สร้างไม่สำเร็จ" value={stats.documentsFailed} unit="เอกสาร" />
        <StatCard label="ประเภทครุภัณฑ์ (ใช้งาน)" value={stats.byType.length} unit="ประเภท" />
      </section>

      <div className="mt-6 grid gap-4 lg:grid-cols-3">
        <section className="card p-4 lg:col-span-2">
          <h2 className="mb-3 text-sm font-semibold">ครุภัณฑ์แยกตามประเภท</h2>
          {stats.byType.length === 0 ? (
            <EmptyState title="ยังไม่มีข้อมูลประเภทครุภัณฑ์" />
          ) : (
            <ul className="flex flex-col gap-3">
              {stats.byType.map((row) => (
                <li key={row.id} className="flex items-center gap-3">
                  <span className="w-40 shrink-0 truncate text-sm" title={row.name}>
                    {row.name}
                  </span>
                  <span
                    aria-hidden
                    className="h-2 flex-1 overflow-hidden rounded-full bg-surface"
                  >
                    <span
                      className="block h-full rounded-full bg-primary"
                      style={{ width: `${Math.round((row.count / maxTypeCount) * 100)}%` }}
                    />
                  </span>
                  <span className="w-16 shrink-0 text-right text-sm tabular-nums text-muted">
                    {row.count.toLocaleString("th-TH")} รายการ
                  </span>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="card p-4">
          <h2 className="mb-3 text-sm font-semibold">สถานะครุภัณฑ์</h2>
          {stats.byStatus.length === 0 ? (
            <EmptyState title="ยังไม่มีข้อมูลครุภัณฑ์" />
          ) : (
            <ul className="flex flex-col gap-2">
              {stats.byStatus.map((row) => (
                <li key={row.status} className="flex items-center justify-between gap-3">
                  <AssetStatusBadge status={row.status} />
                  <span className="text-sm tabular-nums">
                    {row.count.toLocaleString("th-TH")} รายการ
                  </span>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>

      <section className="card mt-6">
        <div className="flex items-center justify-between border-b border-line px-4 py-3">
          <h2 className="text-sm font-semibold">เอกสารล่าสุด</h2>
          <ButtonLink href="/documents" variant="ghost" size="sm">
            ดูทั้งหมด
          </ButtonLink>
        </div>
        {recentDocuments.rows.length === 0 ? (
          <EmptyState
            title="ยังไม่มีเอกสาร"
            description="เอกสาร PDF จะแสดงที่นี่หลังสร้างจากหน้ารายละเอียดครุภัณฑ์หรือจากรายการที่เลือก"
          />
        ) : (
          <ul className="divide-y divide-line">
            {recentDocuments.rows.map((document) => (
              <li key={document.id} className="flex flex-wrap items-center gap-3 px-4 py-3">
                <span className="font-mono text-sm">{document.document_number}</span>
                <span className="text-xs text-muted">
                  {DOCUMENT_TYPE_LABELS[document.document_type]}
                </span>
                <DocumentStatusBadge status={document.generation_status} />
                <span className="ml-auto text-xs text-muted">
                  {formatThaiDate(document.created_at)}
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>
    </AppShell>
  );
}

function StatCard({ label, value, unit }: { label: string; value: number; unit: string }) {
  return (
    <div className="card p-4">
      <p className="text-sm text-muted">{label}</p>
      <p className="mt-1 text-2xl font-semibold tabular-nums">
        {value.toLocaleString("th-TH")}
        <span className="ml-1 text-sm font-normal text-muted">{unit}</span>
      </p>
    </div>
  );
}
