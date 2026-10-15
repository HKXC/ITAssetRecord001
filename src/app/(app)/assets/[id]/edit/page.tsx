import { notFound } from "next/navigation";

import { updateAssetAction } from "@/app/(app)/assets/actions";
import { AssetForm } from "@/components/assets/AssetForm";
import { AppShell } from "@/components/layout/AppShell";
import { NotFoundError } from "@/lib/errors";
import { getAssetById, getAssetFacets } from "@/lib/services/assets";
import { listAssetTypes } from "@/lib/services/assetTypes";
import { getCurrentUser } from "@/lib/supabase/server";

export const instant = false;

export default async function EditAssetPage({ params }: PageProps<"/assets/[id]/edit">) {
  const { id } = await params;

  const [user, assetTypes, facets] = await Promise.all([
    getCurrentUser(),
    listAssetTypes(),
    getAssetFacets(),
  ]);

  const asset = await getAssetById(id).catch((error: unknown) => {
    if (error instanceof NotFoundError) notFound();
    throw error;
  });

  return (
    <AppShell
      title={`แก้ไขครุภัณฑ์ ${asset.asset_code}`}
      description={asset.asset_name}
      userEmail={user?.email ?? null}
    >
      <div className="mx-auto max-w-4xl">
        <AssetForm
          action={updateAssetAction}
          assetTypes={assetTypes}
          values={{
            id: asset.id,
            asset_code: asset.asset_code,
            asset_name: asset.asset_name,
            asset_type_id: asset.asset_type_id,
            brand: asset.brand,
            model: asset.model,
            serial_number: asset.serial_number,
            responsible_person: asset.responsible_person,
            department: asset.department,
            location: asset.location,
            acquisition_date: asset.acquisition_date,
            status: asset.status,
            notes: asset.notes,
          }}
          submitLabel="บันทึกการแก้ไข"
          cancelHref={`/assets/${asset.id}`}
          departments={facets.departments}
          locations={facets.locations}
        />
      </div>
    </AppShell>
  );
}
