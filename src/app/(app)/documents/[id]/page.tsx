import Link from "next/link";
import { notFound } from "next/navigation";

import { regenerateDocumentAction } from "@/app/(app)/documents/actions";
import { Alert, EmptyState } from "@/components/common/Alert";
import { ButtonLink } from "@/components/common/Button";
import { AssetStatusBadge, DocumentStatusBadge } from "@/components/common/StatusBadge";
import { DocumentActionButton } from "@/components/documents/DocumentActionButton";
import { AppShell } from "@/components/layout/AppShell";
import { NotFoundError } from "@/lib/errors";
import { formatThaiDate, formatThaiDateTime } from "@/lib/format/thaiDate";
import { DOCUMENT_TYPE_LABELS, getDocumentDetail } from "@/lib/services/documents";
import { getCurrentUser } from "@/lib/supabase/server";

export const instant = false;

export default async function DocumentDetailPage({
  params,
  searchParams,
}: PageProps<"/documents/[id]">) {
  const { id } = await params;
  const query = await searchParams;

  const user = await getCurrentUser();
  const detail = await getDocumentDetail(id).catch((error: unknown) => {
    if (error instanceof NotFoundError) notFound();
    throw error;
  });

  const { document, asset, assets, revisions } = detail;
  const isReady = document.generation_status === "ready";
  const fileSize = document.file_size_bytes
    ? `${(document.file_size_bytes / 1024).toFixed(1)} KB`
    : "-";

  return (
    <AppShell
      title={`เอกสาร ${document.document_number}`}
      description={DOCUMENT_TYPE_LABELS[document.document_type]}
      userEmail={user?.email ?? null}
      actions={
        <>
          {isReady ? (
            <ButtonLink href={`/api/documents/${document.id}/download`} size="sm">
              ดาวน์โหลด PDF
            </ButtonLink>
          ) : null}
          <ButtonLink href="/documents" variant="ghost" size="sm">
            กลับรายการเอกสาร
          </ButtonLink>
        </>
      }
    >
      <div className="flex flex-col gap-4">
        {query.generated === "1" ? (
          <Alert tone="success">สร้างเอกสารเรียบร้อยแล้ว</Alert>
        ) : null}

        {document.generation_status === "failed" ? (
          <Alert tone="error" role="alert">
            การสร้างเอกสารครั้งนี้ไม่สำเร็จ: {document.error_message ?? "ไม่ทราบสาเหตุ"} —
            ข้อมูลครุภัณฑ์ไม่ได้รับผลกระทบ สามารถกดสร้างใหม่ได้
          </Alert>
        ) : null}

        <section className="card p-4 lg:p-6">
          <div className="mb-4 flex flex-wrap items-center gap-3">
            <DocumentStatusBadge status={document.generation_status} />
            <span className="text-xs text-muted">ครั้งที่พิมพ์ {document.revision}</span>
          </div>

          <dl className="grid gap-x-6 gap-y-3 sm:grid-cols-2 lg:grid-cols-3">
            <Field label="เลขที่เอกสาร" value={document.document_number} mono />
            <Field label="ประเภทเอกสาร" value={DOCUMENT_TYPE_LABELS[document.document_type]} />
            <Field label="วันที่จัดทำ" value={formatThaiDate(document.created_at)} />
            <Field label="สร้างเมื่อ" value={formatThaiDateTime(document.created_at)} />
            <Field
              label="เสร็จสิ้นเมื่อ"
              value={document.completed_at ? formatThaiDateTime(document.completed_at) : "-"}
            />
            <Field label="ขนาดไฟล์" value={fileSize} />
            <Field label="ที่เก็บไฟล์" value={document.storage_path ?? "-"} mono />
            {asset ? (
              <Field
                label="ครุภัณฑ์อ้างอิง"
                value={
                  <Link href={`/assets/${asset.id}`} className="text-primary hover:underline">
                    {asset.asset_code} — {asset.asset_name}
                  </Link>
                }
              />
            ) : null}
          </dl>

          <div className="mt-5 border-t border-line pt-4">
            <DocumentActionButton
              action={regenerateDocumentAction}
              fieldName="document_id"
              fieldValue={document.id}
              label="สร้างเอกสารครั้งใหม่"
              pendingLabel="กำลังสร้างเอกสาร…"
              variant="secondary"
            />
          </div>
        </section>

        {document.document_type === "register" ? (
          <section className="card overflow-hidden">
            <div className="border-b border-line px-4 py-3">
              <h2 className="text-sm font-semibold">
                รายการครุภัณฑ์ในเอกสาร ({assets.length.toLocaleString("th-TH")} รายการ)
              </h2>
              <p className="text-xs text-muted">
                รายการนี้ถูกบันทึกไว้ตอนสร้างเอกสาร จึงตรวจสอบย้อนหลังได้ว่าเอกสารมีอะไรบ้าง
              </p>
            </div>
            {assets.length === 0 ? (
              <EmptyState title="ไม่พบรายการในเอกสารนี้" />
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full min-w-[48rem] text-sm">
                  <thead className="bg-surface text-left">
                    <tr>
                      <th className="table-cell w-16">ลำดับ</th>
                      <th className="table-cell">รหัสครุภัณฑ์</th>
                      <th className="table-cell">ชื่อครุภัณฑ์</th>
                      <th className="table-cell">ประเภท</th>
                      <th className="table-cell">แผนก</th>
                      <th className="table-cell">สถานะ</th>
                    </tr>
                  </thead>
                  <tbody>
                    {assets.map((item, index) => (
                      <tr key={item.id}>
                        <td className="table-cell tabular-nums">{index + 1}</td>
                        <td className="table-cell font-mono">
                          <Link href={`/assets/${item.id}`} className="text-primary hover:underline">
                            {item.asset_code}
                          </Link>
                        </td>
                        <td className="table-cell">{item.asset_name}</td>
                        <td className="table-cell">{item.asset_types?.name ?? "-"}</td>
                        <td className="table-cell">{item.department ?? "-"}</td>
                        <td className="table-cell">
                          <AssetStatusBadge status={item.status} />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>
        ) : null}

        <section className="card overflow-hidden">
          <div className="border-b border-line px-4 py-3">
            <h2 className="text-sm font-semibold">ประวัติการสร้างเอกสาร</h2>
            <p className="text-xs text-muted">
              ทุกครั้งที่สร้างใหม่จะได้ไฟล์ใหม่ ไฟล์เดิมยังคงอยู่และดาวน์โหลดได้
            </p>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-surface text-left">
                <tr>
                  <th className="table-cell">ครั้งที่</th>
                  <th className="table-cell">สถานะ</th>
                  <th className="table-cell">สร้างเมื่อ</th>
                  <th className="table-cell">ขนาดไฟล์</th>
                  <th className="table-cell">ไฟล์</th>
                </tr>
              </thead>
              <tbody>
                {revisions.map((revision) => (
                  <tr key={revision.id} className={revision.id === document.id ? "bg-primary-soft/40" : ""}>
                    <td className="table-cell">
                      <Link href={`/documents/${revision.id}`} className="text-primary hover:underline">
                        ครั้งที่ {revision.revision}
                      </Link>
                      {revision.id === document.id ? (
                        <span className="ml-2 text-xs text-muted">(กำลังดูอยู่)</span>
                      ) : null}
                    </td>
                    <td className="table-cell">
                      <DocumentStatusBadge status={revision.generation_status} />
                    </td>
                    <td className="table-cell whitespace-nowrap">
                      {formatThaiDateTime(revision.created_at)}
                    </td>
                    <td className="table-cell tabular-nums">
                      {revision.file_size_bytes
                        ? `${(revision.file_size_bytes / 1024).toFixed(1)} KB`
                        : "-"}
                    </td>
                    <td className="table-cell">
                      {revision.generation_status === "ready" ? (
                        <a
                          href={`/api/documents/${revision.id}/download`}
                          className="text-primary hover:underline"
                        >
                          ดาวน์โหลด
                        </a>
                      ) : (
                        <span className="text-muted">-</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      </div>
    </AppShell>
  );
}

function Field({
  label,
  value,
  mono = false,
}: {
  label: string;
  value: React.ReactNode;
  mono?: boolean;
}) {
  return (
    <div className="min-w-0">
      <dt className="text-xs text-muted">{label}</dt>
      <dd className={`break-words text-sm ${mono ? "font-mono" : ""}`}>{value}</dd>
    </div>
  );
}
