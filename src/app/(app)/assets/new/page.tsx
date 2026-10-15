import { createAssetAction } from "@/app/(app)/assets/actions";
import { AssetForm } from "@/components/assets/AssetForm";
import { AppShell } from "@/components/layout/AppShell";
import { getAssetFacets } from "@/lib/services/assets";
import { listAssetTypes } from "@/lib/services/assetTypes";
import { getCurrentUser } from "@/lib/supabase/server";

export const instant = false;

export const metadata = { title: "ลงทะเบียนครุภัณฑ์ | ระบบบริหารจัดการครุภัณฑ์ IT" };

export default async function NewAssetPage() {
  const [user, assetTypes, facets] = await Promise.all([
    getCurrentUser(),
    listAssetTypes(),
    getAssetFacets(),
  ]);

  return (
    <AppShell
      title="ลงทะเบียนครุภัณฑ์ใหม่"
      description="กรอกข้อมูลครุภัณฑ์ให้ครบถ้วน รหัสครุภัณฑ์และหมายเลขเครื่องต้องไม่ซ้ำกับที่มีอยู่"
      userEmail={user?.email ?? null}
    >
      <div className="mx-auto max-w-4xl">
        <AssetForm
          action={createAssetAction}
          assetTypes={assetTypes}
          submitLabel="บันทึกครุภัณฑ์"
          cancelHref="/assets"
          departments={facets.departments}
          locations={facets.locations}
        />
      </div>
    </AppShell>
  );
}
