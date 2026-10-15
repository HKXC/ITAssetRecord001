import Link from "next/link";

import { generateRegisterAction } from "@/app/(app)/assets/actions";
import { EmptyState } from "@/components/common/Alert";
import { ButtonLink } from "@/components/common/Button";
import { Pagination } from "@/components/common/Pagination";
import { AssetStatusBadge } from "@/components/common/StatusBadge";
import { AssetFilters } from "@/components/assets/AssetFilters";
import { AssetSelectionForm } from "@/components/assets/AssetSelectionForm";
import { AppShell } from "@/components/layout/AppShell";
import { formatThaiDate } from "@/lib/format/thaiDate";
import { getAssetFacets, listAssets } from "@/lib/services/assets";
import { listAssetTypes } from "@/lib/services/assetTypes";
import { getCurrentUser } from "@/lib/supabase/server";
import { ASSET_STATUS_LABELS, parseAssetSearch } from "@/lib/validation/asset";
import type { AssetSearchInput } from "@/lib/validation/asset";

export const instant = false;

export const metadata = { title: "ทะเบียนครุภัณฑ์ | ระบบบริหารจัดการครุภัณฑ์ IT" };

export default async function AssetsPage({ searchParams }: PageProps<"/assets">) {
  const params = parseAssetSearch(await searchParams);

  const [user, result, assetTypes, facets] = await Promise.all([
    getCurrentUser(),
    listAssets(params),
    listAssetTypes(),
    getAssetFacets(),
  ]);

  const selectionNote = buildSelectionNote(params, assetTypes);

  return (
    <AppShell
      title="ทะเบียนครุภัณฑ์"
      description={`พบครุภัณฑ์ ${result.total.toLocaleString("th-TH")} รายการตามเงื่อนไขที่เลือก`}
      userEmail={user?.email ?? null}
      actions={
        <ButtonLink href="/assets/new" size="sm">
          ลงทะเบียนครุภัณฑ์ใหม่
        </ButtonLink>
      }
    >
      <AssetFilters
        params={params}
        assetTypes={assetTypes}
        departments={facets.departments}
        locations={facets.locations}
      />

      {result.rows.length === 0 ? (
        <div className="card">
          <EmptyState
            title="ไม่พบครุภัณฑ์ตามเงื่อนไข"
            description="ลองปรับเงื่อนไขการค้นหา หรือลงทะเบียนครุภัณฑ์ใหม่"
            action={<ButtonLink href="/assets/new" size="sm">ลงทะเบียนครุภัณฑ์ใหม่</ButtonLink>}
          />
        </div>
      ) : (
        <AssetSelectionForm action={generateRegisterAction} selectionNote={selectionNote}>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[56rem] text-sm">
              <thead className="bg-surface text-left">
                <tr>
                  <th className="table-cell w-10">
                    <span className="sr-only">เลือก</span>
                  </th>
                  <th className="table-cell">
                    <SortLink params={params} field="asset_code" label="รหัสครุภัณฑ์" />
                  </th>
                  <th className="table-cell">
                    <SortLink params={params} field="asset_name" label="ชื่อครุภัณฑ์" />
                  </th>
                  <th className="table-cell">ประเภท</th>
                  <th className="table-cell">หมายเลขเครื่อง</th>
                  <th className="table-cell">แผนก</th>
                  <th className="table-cell">สถานที่</th>
                  <th className="table-cell">
                    <SortLink params={params} field="acquisition_date" label="วันที่ได้มา" />
                  </th>
                  <th className="table-cell">สถานะ</th>
                  <th className="table-cell">จัดการ</th>
                </tr>
              </thead>
              <tbody>
                {result.rows.map((asset) => (
                  <tr key={asset.id} className="hover:bg-surface/60">
                    <td className="table-cell">
                      <input
                        type="checkbox"
                        name="asset_ids"
                        value={asset.id}
                        aria-label={`เลือก ${asset.asset_code}`}
                        className="h-4 w-4 accent-[var(--color-primary)]"
                      />
                    </td>
                    <td className="table-cell font-mono">{asset.asset_code}</td>
                    <td className="table-cell">
                      <Link href={`/assets/${asset.id}`} className="text-primary hover:underline">
                        {asset.asset_name}
                      </Link>
                    </td>
                    <td className="table-cell">{asset.asset_types?.name ?? "-"}</td>
                    <td className="table-cell font-mono">{asset.serial_number ?? "-"}</td>
                    <td className="table-cell">{asset.department ?? "-"}</td>
                    <td className="table-cell">{asset.location ?? "-"}</td>
                    <td className="table-cell whitespace-nowrap">
                      {formatThaiDate(asset.acquisition_date, { short: true })}
                    </td>
                    <td className="table-cell">
                      <AssetStatusBadge status={asset.status} />
                    </td>
                    <td className="table-cell">
                      <div className="flex flex-col gap-1">
                        <Link
                          href={`/assets/${asset.id}`}
                          className="text-primary hover:underline"
                        >
                          ดูข้อมูล
                        </Link>
                        <Link
                          href={`/assets/${asset.id}/edit`}
                          className="text-muted hover:underline"
                        >
                          แก้ไข
                        </Link>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <Pagination
            basePath="/assets"
            params={queryParams(params)}
            page={result.page}
            pageCount={result.pageCount}
            total={result.total}
            perPage={result.perPage}
            unit="รายการ"
          />
        </AssetSelectionForm>
      )}
    </AppShell>
  );
}

function queryParams(params: AssetSearchInput) {
  return {
    q: params.q,
    asset_type_id: params.asset_type_id,
    department: params.department,
    location: params.location,
    status: params.status,
    per_page: params.per_page,
    sort: params.sort,
    dir: params.dir,
  };
}

function SortLink({
  params,
  field,
  label,
}: {
  params: AssetSearchInput;
  field: AssetSearchInput["sort"];
  label: string;
}) {
  const isActive = params.sort === field;
  const nextDir = isActive && params.dir === "asc" ? "desc" : "asc";
  const search = new URLSearchParams();
  for (const [key, value] of Object.entries(queryParams(params))) {
    if (value === null || value === undefined || value === "") continue;
    search.set(key, String(value));
  }
  search.set("sort", field);
  search.set("dir", nextDir);
  search.delete("page");

  return (
    <Link href={`/assets?${search.toString()}`} className="inline-flex items-center gap-1">
      {label}
      <span aria-hidden className={isActive ? "text-primary" : "text-muted"}>
        {isActive ? (params.dir === "asc" ? "▲" : "▼") : "↕"}
      </span>
    </Link>
  );
}

/** Human-readable description of the current filters, stored on the generated register. */
function buildSelectionNote(
  params: AssetSearchInput,
  assetTypes: { id: number; name: string }[],
): string {
  const parts: string[] = [];
  if (params.q) parts.push(`ค้นหา: ${params.q}`);
  if (params.asset_type_id) {
    const type = assetTypes.find((item) => item.id === params.asset_type_id);
    parts.push(`ประเภท: ${type?.name ?? params.asset_type_id}`);
  }
  if (params.department) parts.push(`แผนก: ${params.department}`);
  if (params.location) parts.push(`สถานที่: ${params.location}`);
  if (params.status) parts.push(`สถานะ: ${ASSET_STATUS_LABELS[params.status]}`);

  return parts.length > 0 ? parts.join(" · ") : "เลือกจากรายการทั้งหมด";
}
