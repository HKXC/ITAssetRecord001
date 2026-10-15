"use client";

import { useActionState } from "react";

import type { AssetTypeFormState } from "@/app/(app)/settings/asset-types/actions";
import { Alert } from "@/components/common/Alert";
import { Field, TextInput } from "@/components/common/Field";
import { SubmitButton } from "@/components/common/SubmitButton";
import type { AssetTypeRow } from "@/lib/database.types";

type Action = (state: AssetTypeFormState, formData: FormData) => Promise<AssetTypeFormState>;

const initialState: AssetTypeFormState = { status: "idle", message: null, errors: {} };

export function CreateAssetTypeForm({ action }: { action: Action }) {
  const [state, formAction] = useActionState(action, initialState);

  return (
    <form action={formAction} className="card flex flex-col gap-4 p-4" noValidate>
      <h2 className="text-sm font-semibold">เพิ่มประเภทครุภัณฑ์</h2>

      {state.message ? (
        <Alert tone={state.status === "error" ? "error" : "success"}>{state.message}</Alert>
      ) : null}

      <div className="grid gap-3 md:grid-cols-3">
        <Field label="รหัสประเภท" htmlFor="new-code" required error={state.errors.code} hint="A-Z 0-9 _ เช่น NAS">
          <TextInput id="new-code" name="code" required invalid={Boolean(state.errors.code)} />
        </Field>
        <Field label="ชื่อประเภท" htmlFor="new-name" required error={state.errors.name}>
          <TextInput id="new-name" name="name" required invalid={Boolean(state.errors.name)} />
        </Field>
        <Field label="ลำดับการแสดง" htmlFor="new-sort" error={state.errors.sort_order}>
          <TextInput id="new-sort" name="sort_order" type="number" min={0} defaultValue={100} />
        </Field>
      </div>

      <input type="hidden" name="is_active" value="true" />

      <div>
        <SubmitButton pendingLabel="กำลังบันทึก…">เพิ่มประเภท</SubmitButton>
      </div>
    </form>
  );
}

export function EditAssetTypeForm({ action, assetType }: { action: Action; assetType: AssetTypeRow }) {
  const [state, formAction] = useActionState(action, initialState);

  return (
    <form action={formAction} className="flex flex-col gap-2" noValidate>
      <input type="hidden" name="id" value={assetType.id} />
      <input type="hidden" name="is_active" value={String(assetType.is_active)} />

      <div className="grid gap-2 md:grid-cols-[6rem_1fr_7rem_auto] md:items-end">
        <Field label="รหัส" htmlFor={`code-${assetType.id}`} error={state.errors.code}>
          <TextInput
            id={`code-${assetType.id}`}
            name="code"
            defaultValue={assetType.code}
            invalid={Boolean(state.errors.code)}
          />
        </Field>
        <Field label="ชื่อประเภท" htmlFor={`name-${assetType.id}`} error={state.errors.name}>
          <TextInput
            id={`name-${assetType.id}`}
            name="name"
            defaultValue={assetType.name}
            invalid={Boolean(state.errors.name)}
          />
        </Field>
        <Field label="ลำดับ" htmlFor={`sort-${assetType.id}`} error={state.errors.sort_order}>
          <TextInput
            id={`sort-${assetType.id}`}
            name="sort_order"
            type="number"
            min={0}
            defaultValue={assetType.sort_order}
          />
        </Field>
        <div className="pb-1">
          <SubmitButton variant="secondary" size="sm" pendingLabel="กำลังบันทึก…">
            บันทึก
          </SubmitButton>
        </div>
      </div>

      {state.message ? (
        <Alert tone={state.status === "error" ? "error" : "success"}>{state.message}</Alert>
      ) : null}
    </form>
  );
}

export function ToggleAssetTypeForm({
  action,
  assetType,
  assetCount,
}: {
  action: Action;
  assetType: AssetTypeRow;
  assetCount: number;
}) {
  const [state, formAction] = useActionState(action, initialState);
  const nextState = !assetType.is_active;

  return (
    <form action={formAction} className="flex flex-col gap-2">
      <input type="hidden" name="id" value={assetType.id} />
      <input type="hidden" name="is_active" value={String(nextState)} />
      <SubmitButton
        variant={nextState ? "primary" : "ghost"}
        size="sm"
        pendingLabel="กำลังบันทึก…"
      >
        {nextState ? "เปิดใช้งาน" : "ปิดใช้งาน"}
      </SubmitButton>
      {!assetType.is_active && assetCount > 0 ? (
        <span className="text-xs text-muted">มีครุภัณฑ์ใช้งานอยู่ ไม่สามารถปิดได้</span>
      ) : null}
      {state.message ? (
        <span className={state.status === "error" ? "text-xs text-danger" : "text-xs text-primary"}>
          {state.message}
        </span>
      ) : null}
    </form>
  );
}
