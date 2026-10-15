import Link from "next/link";

import { Field, Select, TextInput } from "@/components/common/Field";
import type { AssetTypeRow } from "@/lib/database.types";
import { ASSET_STATUSES, ASSET_STATUS_LABELS } from "@/lib/validation/asset";
import type { AssetSearchInput } from "@/lib/validation/asset";

/**
 * Filters are a plain GET form, so searching works without JavaScript, the result is a
 * shareable URL, and the browser's back button behaves as users expect.
 */
export function AssetFilters({
  params,
  assetTypes,
  departments,
  locations,
}: {
  params: AssetSearchInput;
  assetTypes: AssetTypeRow[];
  departments: string[];
  locations: string[];
}) {
  const hasFilters = Boolean(
    params.q || params.asset_type_id || params.department || params.location || params.status,
  );

  return (
    <form method="get" action="/assets" className="card mb-4 p-4">
      <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-5">
        <Field label="ค้นหา" htmlFor="q">
          <TextInput
            id="q"
            name="q"
            defaultValue={params.q ?? ""}
            placeholder="รหัส / ชื่อ / Serial"
            autoComplete="off"
          />
        </Field>

        <Field label="ประเภท" htmlFor="asset_type_id">
          <Select
            id="asset_type_id"
            name="asset_type_id"
            defaultValue={params.asset_type_id ? String(params.asset_type_id) : ""}
          >
            <option value="">ทั้งหมด</option>
            {assetTypes.map((type) => (
              <option key={type.id} value={type.id}>
                {type.name}
              </option>
            ))}
          </Select>
        </Field>

        <Field label="แผนก / หน่วยงาน" htmlFor="department">
          <Select id="department" name="department" defaultValue={params.department ?? ""}>
            <option value="">ทั้งหมด</option>
            {departments.map((department) => (
              <option key={department} value={department}>
                {department}
              </option>
            ))}
          </Select>
        </Field>

        <Field label="สถานที่" htmlFor="location">
          <Select id="location" name="location" defaultValue={params.location ?? ""}>
            <option value="">ทั้งหมด</option>
            {locations.map((location) => (
              <option key={location} value={location}>
                {location}
              </option>
            ))}
          </Select>
        </Field>

        <Field label="สถานะ" htmlFor="status">
          <Select id="status" name="status" defaultValue={params.status ?? ""}>
            <option value="">ทั้งหมด</option>
            {ASSET_STATUSES.map((status) => (
              <option key={status} value={status}>
                {ASSET_STATUS_LABELS[status]}
              </option>
            ))}
          </Select>
        </Field>
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-2">
        <input type="hidden" name="per_page" value={String(params.per_page)} />
        <input type="hidden" name="sort" value={params.sort} />
        <input type="hidden" name="dir" value={params.dir} />
        <button
          type="submit"
          className="rounded-md border border-primary bg-primary px-4 py-2 text-sm font-medium text-on-primary hover:bg-primary-hover"
        >
          ค้นหา
        </button>
        {hasFilters ? (
          <Link
            href="/assets"
            className="rounded-md border border-line px-4 py-2 text-sm hover:bg-surface"
          >
            ล้างตัวกรอง
          </Link>
        ) : null}
      </div>
    </form>
  );
}
