"use client";

import Link from "next/link";
import { useActionState } from "react";

import type { AssetFormState } from "@/app/(app)/assets/actions";
import { Alert } from "@/components/common/Alert";
import { Field, Select, TextArea, TextInput } from "@/components/common/Field";
import { SubmitButton } from "@/components/common/SubmitButton";
import type { AssetTypeRow } from "@/lib/database.types";
import { ASSET_STATUSES, ASSET_STATUS_LABELS } from "@/lib/validation/asset";

export type AssetFormValues = {
  id?: string;
  asset_code?: string | null;
  asset_name?: string | null;
  asset_type_id?: number | null;
  brand?: string | null;
  model?: string | null;
  serial_number?: string | null;
  responsible_person?: string | null;
  department?: string | null;
  location?: string | null;
  acquisition_date?: string | null;
  status?: string | null;
  notes?: string | null;
};

export function AssetForm({
  action,
  assetTypes,
  values = {},
  submitLabel,
  cancelHref,
  departments = [],
  locations = [],
}: {
  action: (state: AssetFormState, formData: FormData) => Promise<AssetFormState>;
  assetTypes: AssetTypeRow[];
  values?: AssetFormValues;
  submitLabel: string;
  cancelHref: string;
  departments?: string[];
  locations?: string[];
}) {
  const [state, formAction] = useActionState(action, {
    status: "idle" as const,
    message: null,
    errors: {},
  });

  const errors = state.errors ?? {};

  return (
    <form action={formAction} className="card flex flex-col gap-5 p-4 lg:p-6" noValidate>
      {values.id ? <input type="hidden" name="id" value={values.id} /> : null}

      {state.message ? (
        <Alert tone="error" role="alert">
          {state.message}
        </Alert>
      ) : null}

      <div className="grid gap-4 md:grid-cols-2">
        <Field label="รหัสครุภัณฑ์" htmlFor="asset_code" required error={errors.asset_code} hint="ใช้ A-Z 0-9 และ . _ / - เช่น UPS-BACKUP-01">
          <TextInput
            id="asset_code"
            name="asset_code"
            defaultValue={values.asset_code ?? ""}
            required
            invalid={Boolean(errors.asset_code)}
            autoComplete="off"
            placeholder="UPS-BACKUP-01"
          />
        </Field>

        <Field label="ชื่อครุภัณฑ์" htmlFor="asset_name" required error={errors.asset_name}>
          <TextInput
            id="asset_name"
            name="asset_name"
            defaultValue={values.asset_name ?? ""}
            required
            invalid={Boolean(errors.asset_name)}
          />
        </Field>

        <Field label="ประเภทครุภัณฑ์" htmlFor="asset_type_id" required error={errors.asset_type_id}>
          <Select
            id="asset_type_id"
            name="asset_type_id"
            defaultValue={values.asset_type_id ? String(values.asset_type_id) : ""}
            required
            invalid={Boolean(errors.asset_type_id)}
          >
            <option value="">— เลือกประเภท —</option>
            {assetTypes.map((type) => (
              <option key={type.id} value={type.id}>
                {type.name}
              </option>
            ))}
          </Select>
        </Field>

        <Field label="สถานะ" htmlFor="status" required error={errors.status}>
          <Select id="status" name="status" defaultValue={values.status ?? "active"}>
            {ASSET_STATUSES.map((status) => (
              <option key={status} value={status}>
                {ASSET_STATUS_LABELS[status]}
              </option>
            ))}
          </Select>
        </Field>

        <Field label="ยี่ห้อ" htmlFor="brand" error={errors.brand}>
          <TextInput id="brand" name="brand" defaultValue={values.brand ?? ""} />
        </Field>

        <Field label="รุ่น" htmlFor="model" error={errors.model}>
          <TextInput id="model" name="model" defaultValue={values.model ?? ""} />
        </Field>

        <Field
          label="หมายเลขเครื่อง (Serial Number)"
          htmlFor="serial_number"
          error={errors.serial_number}
          hint="ต้องไม่ซ้ำกับเครื่องอื่นในระบบ"
        >
          <TextInput
            id="serial_number"
            name="serial_number"
            defaultValue={values.serial_number ?? ""}
            invalid={Boolean(errors.serial_number)}
            autoComplete="off"
          />
        </Field>

        <Field label="วันที่ได้มา" htmlFor="acquisition_date" error={errors.acquisition_date}>
          <TextInput
            id="acquisition_date"
            name="acquisition_date"
            type="date"
            defaultValue={values.acquisition_date ?? ""}
            invalid={Boolean(errors.acquisition_date)}
          />
        </Field>

        <Field label="ผู้รับผิดชอบ" htmlFor="responsible_person" error={errors.responsible_person}>
          <TextInput
            id="responsible_person"
            name="responsible_person"
            defaultValue={values.responsible_person ?? ""}
          />
        </Field>

        <Field label="แผนก / หน่วยงาน" htmlFor="department" error={errors.department}>
          <TextInput
            id="department"
            name="department"
            list="department-options"
            defaultValue={values.department ?? ""}
          />
          <datalist id="department-options">
            {departments.map((department) => (
              <option key={department} value={department} />
            ))}
          </datalist>
        </Field>

        <Field label="สถานที่ตั้ง" htmlFor="location" error={errors.location}>
          <TextInput id="location" name="location" list="location-options" defaultValue={values.location ?? ""} />
          <datalist id="location-options">
            {locations.map((location) => (
              <option key={location} value={location} />
            ))}
          </datalist>
        </Field>
      </div>

      <Field label="หมายเหตุ" htmlFor="notes" error={errors.notes}>
        <TextArea id="notes" name="notes" defaultValue={values.notes ?? ""} />
      </Field>

      <div className="flex flex-wrap items-center gap-2 border-t border-line pt-4">
        <SubmitButton pendingLabel="กำลังบันทึก…">{submitLabel}</SubmitButton>
        <Link
          href={cancelHref}
          className="rounded-md border border-line px-4 py-2 text-sm hover:bg-surface"
        >
          ยกเลิก
        </Link>
      </div>
    </form>
  );
}
