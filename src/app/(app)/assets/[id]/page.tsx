import Link from "next/link";
import { notFound } from "next/navigation";

import { generateAssetDocumentAction } from "@/app/(app)/assets/actions";
import { Alert, EmptyState } from "@/components/common/Alert";
import { ButtonLink } from "@/components/common/Button";
import { AssetStatusBadge, DocumentStatusBadge } from "@/components/common/StatusBadge";
import { DocumentActionButton } from "@/components/documents/DocumentActionButton";
import { AppShell } from "@/components/layout/AppShell";
import { NotFoundError } from "@/lib/errors";
import { formatThaiDate, formatThaiDateTime } from "@/lib/format/thaiDate";
import { getAssetById } from "@/lib/services/assets";
import { listAssetDocuments } from "@/lib/services/documents";
import { getCurrentUser } from "@/lib/supabase/server";
import { ASSET_STATUS_LABELS } from "@/lib/validation/asset";

export const instant = false;

export default async function AssetDetailPage({
  params,
  searchParams,
}: PageProps<"/assets/[id]">) {
  const { id } = await params;
  const query = await searchParams;
  const justCreated = query.created === "1";
  const justUpdated = query.updated === "1";

  const [user, documents] = await Promise.all([getCurrentUser(), listAssetDocuments(id).catch(() => [])]);

  const asset = await getAssetById(id).catch((error: unknown) => {
    if (error instanceof NotFoundError) notFound();
    throw error;
  });

  const fields: { label: string; value: string }[] = [
    { label: "รหัสครุภัณฑ์", value: asset.asset_code },
    { label: "ชื่อครุภัณฑ์", value: asset.asset_name },
    { label: "ประเภท", value: asset.asset_types?.name ?? "-" },
    { label: "ยี่ห้อ / รุ่น", value: [asset.brand, asset.model].filter(Boolean).join(" / ") || "-" },
    { label: "หมายเลขเครื่อง", value: asset.serial_number ?? "-" },
    { label: "ผู้รับผิดชอบ", value: asset.responsible_person ?? "-" },
    { label: "แผนก / หน่วยงาน", value: asset.department ?? "-" },
    { label: "สถานที่ตั้ง", value: asset.location ?? "-" },
    { label: "วันที่ได้มา", value: formatThaiDate(asset.acquisition_date) },
    { label: "ลงทะเบียนเมื่อ", value: formatThaiDate(asset.created_at) },
    { label: "แก้ไขล่าสุด", value: formatThaiDateTime(asset.updated_at) },
    { label: "หมายเหตุ", value: asset.notes ?? "-" },
  ];

  return (
    <AppShell
      title={asset.asset_name}
      description={`รหัสครุภัณฑ์ ${asset.asset_code}`}
      userEmail={user?.email ?? null}
      actions={
        <>
          <ButtonLink href={`/assets/${asset.id}/edit`} variant="secondary" size="sm">
            แก้ไขข้อมูล
          </ButtonLink>
          <ButtonLink href="/assets" variant="ghost" size="sm">
            กลับรายการ
          </ButtonLink>
        </>
      }
    >
      <div className="flex flex-col gap-4">
        {justCreated ? <Alert tone="success">บันทึกครุภัณฑ์เรียบร้อยแล้ว</Alert> : null}
        {justUpdated ? <Alert tone="success">บันทึกการแก้ไขเรียบร้อยแล้ว</Alert> : null}

        <section className="card p-4 lg:p-6">
          <div className="mb-4 flex flex-wrap items-center gap-3">
            <AssetStatusBadge status={asset.status} />
            <span className="text-xs text-muted">สถานะ: {ASSET_STATUS_LABELS[asset.status]}</span>
          </div>
          <dl className="grid gap-x-6 gap-y-3 sm:grid-cols-2 lg:grid-cols-3">
            {fields.map((field) => (
              <div key={field.label} className="min-w-0">
                <dt className="text-xs text-muted">{field.label}</dt>
                <dd className="break-words text-sm">{field.value}</dd>
              </div>
            ))}
          </dl>
        </section>

        <section className="card p-4 lg:p-6">
          <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
            <div>
              <h2 className="text-sm font-semibold">เอกสาร PDF ของครุภัณฑ์นี้</h2>
              <p className="text-xs text-muted">
                การสร้างซ้ำจะเพิ่มเป็นครั้งที่ใหม่ โดยเอกสารครั้งก่อนยังคงดาวน์โหลดได้
              </p>
            </div>
            <DocumentActionButton
              action={generateAssetDocumentAction}
              fieldName="asset_id"
              fieldValue={asset.id}
              label={documents.length === 0 ? "สร้างเอกสาร PDF" : "สร้างเอกสารครั้งใหม่"}
              pendingLabel="กำลังสร้างเอกสาร…"
            />
          </div>

          {documents.length === 0 ? (
            <EmptyState
              title="ยังไม่มีเอกสารสำหรับครุภัณฑ์นี้"
              description="กดปุ่มสร้างเอกสาร PDF เพื่อออกเอกสารข้อมูลครุภัณฑ์"
            />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-surface text-left">
                  <tr>
                    <th className="table-cell">เลขที่เอกสาร</th>
                    <th className="table-cell">ครั้งที่</th>
                    <th className="table-cell">สถานะ</th>
                    <th className="table-cell">สร้างเมื่อ</th>
                    <th className="table-cell">ดาวน์โหลด</th>
                  </tr>
                </thead>
                <tbody>
                  {documents.map((document) => (
                    <tr key={document.id}>
                      <td className="table-cell font-mono">
                        <Link href={`/documents/${document.id}`} className="text-primary hover:underline">
                          {document.document_number}
                        </Link>
                      </td>
                      <td className="table-cell">{document.revision}</td>
                      <td className="table-cell">
                        <DocumentStatusBadge status={document.generation_status} />
                      </td>
                      <td className="table-cell whitespace-nowrap">
                        {formatThaiDateTime(document.created_at)}
                      </td>
                      <td className="table-cell">
                        {document.generation_status === "ready" ? (
                          <a
                            href={`/api/documents/${document.id}/download`}
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
          )}
        </section>
      </div>
    </AppShell>
  );
}
