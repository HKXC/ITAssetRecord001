import {
  createAssetTypeAction,
  toggleAssetTypeActiveAction,
  updateAssetTypeAction,
} from "@/app/(app)/settings/asset-types/actions";
import { EmptyState } from "@/components/common/Alert";
import { AppShell } from "@/components/layout/AppShell";
import {
  CreateAssetTypeForm,
  EditAssetTypeForm,
  ToggleAssetTypeForm,
} from "@/components/settings/AssetTypeForms";
import { getAssetStats } from "@/lib/services/assets";
import { countAssetsOfType, listAssetTypes } from "@/lib/services/assetTypes";
import { getCurrentUser } from "@/lib/supabase/server";

export const instant = false;

export const metadata = { title: "ตั้งค่าประเภทครุภัณฑ์ | ระบบบริหารจัดการครุภัณฑ์ IT" };

export default async function AssetTypesPage() {
  const [user, assetTypes, stats] = await Promise.all([
    getCurrentUser(),
    listAssetTypes({ includeInactive: true }),
    getAssetStats(),
  ]);

  const countsByType = new Map(stats.byType.map((row) => [row.id, row.count]));

  // The stats function counts active types only, so inactive ones are counted directly.
  const inactiveCounts = await Promise.all(
    assetTypes
      .filter((type) => !type.is_active)
      .map(async (type) => [type.id, await countAssetsOfType(type.id)] as const),
  );
  for (const [id, count] of inactiveCounts) countsByType.set(id, count);

  return (
    <AppShell
      title="ตั้งค่าประเภทครุภัณฑ์"
      description="เพิ่มหรือแก้ไขประเภทครุภัณฑ์ที่ใช้ในระบบ ปิดใช้งานได้เมื่อไม่มีครุภัณฑ์ใช้งานอยู่"
      userEmail={user?.email ?? null}
    >
      <div className="flex flex-col gap-4">
        <CreateAssetTypeForm action={createAssetTypeAction} />

        <section className="card overflow-hidden">
          <div className="border-b border-line px-4 py-3">
            <h2 className="text-sm font-semibold">ประเภทครุภัณฑ์ในระบบ</h2>
            <p className="text-xs text-muted">
              การลบประเภททำได้ไม่ตรง ๆ เพราะเอกสารและครุภัณฑ์เดิมต้องอ้างอิงประเภทได้ตลอด
            </p>
          </div>

          {assetTypes.length === 0 ? (
            <EmptyState title="ยังไม่มีประเภทครุภัณฑ์" />
          ) : (
            <ul className="divide-y divide-line">
              {assetTypes.map((assetType) => (
                <li key={assetType.id} className="flex flex-col gap-3 px-4 py-4 lg:flex-row lg:items-start">
                  <div className="min-w-0 flex-1">
                    <EditAssetTypeForm action={updateAssetTypeAction} assetType={assetType} />
                  </div>
                  <div className="flex shrink-0 flex-col items-start gap-1 lg:w-48">
                    <span className="text-xs text-muted">
                      ครุภัณฑ์ที่ใช้: {(countsByType.get(assetType.id) ?? 0).toLocaleString("th-TH")} รายการ
                    </span>
                    <span className="text-xs text-muted">
                      สถานะ: {assetType.is_active ? "เปิดใช้งาน" : "ปิดใช้งาน"}
                    </span>
                    <ToggleAssetTypeForm
                      action={toggleAssetTypeActiveAction}
                      assetType={assetType}
                      assetCount={countsByType.get(assetType.id) ?? 0}
                    />
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </AppShell>
  );
}
