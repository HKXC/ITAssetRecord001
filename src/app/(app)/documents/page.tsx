import Link from "next/link";

import { EmptyState } from "@/components/common/Alert";
import { ButtonLink } from "@/components/common/Button";
import { Field, Select, TextInput } from "@/components/common/Field";
import { Pagination } from "@/components/common/Pagination";
import { DocumentStatusBadge } from "@/components/common/StatusBadge";
import { AppShell } from "@/components/layout/AppShell";
import { formatThaiDateTime } from "@/lib/format/thaiDate";
import {
  DOCUMENT_TYPE_LABELS,
  GENERATION_STATUS_LABELS,
  listDocuments,
} from "@/lib/services/documents";
import { getCurrentUser } from "@/lib/supabase/server";
import { GENERATION_STATUSES, DOCUMENT_TYPES, parseDocumentSearch } from "@/lib/validation/documents";

export const instant = false;

export const metadata = { title: "เอกสาร PDF | ระบบบริหารจัดการครุภัณฑ์ IT" };

export default async function DocumentsPage({ searchParams }: PageProps<"/documents">) {
  const params = parseDocumentSearch(await searchParams);

  const [user, result] = await Promise.all([
    getCurrentUser(),
    listDocuments({
      q: params.q,
      documentType: params.document_type,
      status: params.status,
      page: params.page,
      perPage: params.per_page,
    }),
  ]);

  return (
    <AppShell
      title="เอกสาร PDF"
      description={`เอกสารในระบบ ${result.total.toLocaleString("th-TH")} รายการ`}
      userEmail={user?.email ?? null}
      actions={
        <ButtonLink href="/assets" variant="secondary" size="sm">
          ไปยังทะเบียนครุภัณฑ์
        </ButtonLink>
      }
    >
      <form method="get" action="/documents" className="card mb-4 p-4">
        <div className="grid gap-3 md:grid-cols-3">
          <Field label="ค้นหาเลขที่เอกสาร" htmlFor="q">
            <TextInput id="q" name="q" defaultValue={params.q ?? ""} placeholder="ITA- / REG-" />
          </Field>
          <Field label="ประเภทเอกสาร" htmlFor="document_type">
            <Select id="document_type" name="document_type" defaultValue={params.document_type ?? ""}>
              <option value="">ทั้งหมด</option>
              {DOCUMENT_TYPES.map((type) => (
                <option key={type} value={type}>
                  {DOCUMENT_TYPE_LABELS[type]}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="สถานะ" htmlFor="status">
            <Select id="status" name="status" defaultValue={params.status ?? ""}>
              <option value="">ทั้งหมด</option>
              {GENERATION_STATUSES.map((status) => (
                <option key={status} value={status}>
                  {GENERATION_STATUS_LABELS[status]}
                </option>
              ))}
            </Select>
          </Field>
        </div>
        <div className="mt-3 flex flex-wrap items-center gap-2">
          <input type="hidden" name="per_page" value={String(params.per_page)} />
          <button
            type="submit"
            className="rounded-md border border-primary bg-primary px-4 py-2 text-sm font-medium text-on-primary hover:bg-primary-hover"
          >
            ค้นหา
          </button>
          <Link
            href="/documents"
            className="rounded-md border border-line px-4 py-2 text-sm hover:bg-surface"
          >
            ล้างตัวกรอง
          </Link>
        </div>
      </form>

      <section className="card overflow-hidden">
        {result.rows.length === 0 ? (
          <EmptyState
            title="ไม่พบเอกสาร"
            description="เอกสารจะถูกสร้างจากหน้ารายละเอียดครุภัณฑ์ (รายเครื่อง) หรือจากรายการที่เลือกในทะเบียนครุภัณฑ์ (ทะเบียนรวม)"
            action={<ButtonLink href="/assets" size="sm">ไปยังทะเบียนครุภัณฑ์</ButtonLink>}
          />
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[52rem] text-sm">
                <thead className="bg-surface text-left">
                  <tr>
                    <th className="table-cell">เลขที่เอกสาร</th>
                    <th className="table-cell">ประเภท</th>
                    <th className="table-cell">อ้างอิง</th>
                    <th className="table-cell">ครั้งที่</th>
                    <th className="table-cell">สถานะ</th>
                    <th className="table-cell">สร้างเมื่อ</th>
                    <th className="table-cell">ไฟล์</th>
                  </tr>
                </thead>
                <tbody>
                  {result.rows.map((document) => (
                    <tr key={document.id} className="hover:bg-surface/60">
                      <td className="table-cell font-mono">
                        <Link href={`/documents/${document.id}`} className="text-primary hover:underline">
                          {document.document_number}
                        </Link>
                      </td>
                      <td className="table-cell">{DOCUMENT_TYPE_LABELS[document.document_type]}</td>
                      <td className="table-cell">
                        {document.assets ? (
                          <Link
                            href={`/assets/${document.assets.id}`}
                            className="text-primary hover:underline"
                          >
                            {document.assets.asset_code} — {document.assets.asset_name}
                          </Link>
                        ) : (
                          <span className="text-muted">รายการที่เลือก (ทะเบียนรวม)</span>
                        )}
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

            <Pagination
              basePath="/documents"
              params={{
                q: params.q,
                document_type: params.document_type,
                status: params.status,
                per_page: params.per_page,
              }}
              page={result.page}
              pageCount={result.pageCount}
              total={result.total}
              perPage={result.perPage}
              unit="เอกสาร"
            />
          </>
        )}
      </section>
    </AppShell>
  );
}
