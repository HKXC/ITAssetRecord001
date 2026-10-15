import Link from "next/link";

function buildHref(
  basePath: string,
  params: Record<string, string | number | null | undefined>,
  page: number,
): string {
  const search = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value === null || value === undefined || value === "") continue;
    search.set(key, String(value));
  }
  search.set("page", String(page));
  return `${basePath}?${search.toString()}`;
}

export function Pagination({
  basePath,
  params,
  page,
  pageCount,
  total,
  perPage,
  unit = "รายการ",
}: {
  basePath: string;
  params: Record<string, string | number | null | undefined>;
  page: number;
  pageCount: number;
  total: number;
  perPage: number;
  unit?: string;
}) {
  if (total === 0) return null;

  const first = (page - 1) * perPage + 1;
  const last = Math.min(page * perPage, total);
  const linkClass =
    "rounded-md border border-line px-3 py-1.5 text-sm text-ink hover:bg-surface aria-disabled:pointer-events-none aria-disabled:opacity-50";

  return (
    <nav
      aria-label="การแบ่งหน้า"
      className="flex flex-wrap items-center justify-between gap-3 border-t border-line px-4 py-3 text-sm"
    >
      <p className="text-muted">
        แสดง {first}-{last} จาก {total.toLocaleString("th-TH")} {unit}
      </p>
      <div className="flex items-center gap-2">
        <Link
          href={buildHref(basePath, params, Math.max(1, page - 1))}
          aria-disabled={page <= 1}
          className={linkClass}
        >
          ก่อนหน้า
        </Link>
        <span className="px-2 text-muted">
          หน้า {page} / {pageCount}
        </span>
        <Link
          href={buildHref(basePath, params, Math.min(pageCount, page + 1))}
          aria-disabled={page >= pageCount}
          className={linkClass}
        >
          ถัดไป
        </Link>
      </div>
    </nav>
  );
}
