"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { useActionState } from "react";

import type { DocumentActionState } from "@/app/(app)/assets/actions";
import { Alert } from "@/components/common/Alert";
import { SubmitButton } from "@/components/common/SubmitButton";

/**
 * Wraps the asset table so rows can be selected with checkboxes and exported as one
 * consolidated register.
 *
 * The table itself is passed through as children, so it stays a server component while the
 * form, the live selection count and the error state are client-side. The server action
 * re-reads every selected asset from the database before rendering, so a stale selection
 * cannot silently export a different set.
 */
export function AssetSelectionForm({
  action,
  selectionNote,
  children,
}: {
  action: (state: DocumentActionState, formData: FormData) => Promise<DocumentActionState>;
  selectionNote?: string | null;
  children: ReactNode;
}) {
  const [state, formAction] = useActionState(action, {
    status: "idle" as const,
    message: null,
  });
  const formRef = useRef<HTMLFormElement>(null);
  const [selectedCount, setSelectedCount] = useState(0);

  useEffect(() => {
    const form = formRef.current;
    if (!form) return;

    const update = () => setSelectedCount(new FormData(form).getAll("asset_ids").length);
    update();
    form.addEventListener("change", update);
    return () => form.removeEventListener("change", update);
  }, []);

  return (
    <form ref={formRef} action={formAction} className="card overflow-hidden">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-line bg-surface px-4 py-3">
        <div>
          <p className="text-sm font-medium">สร้างเอกสารทะเบียนรวม</p>
          <p className="text-xs text-muted">
            เลือกรายการครุภัณฑ์ที่ต้องการ แล้วสร้างไฟล์ PDF ทะเบียนรวม (เลือกไว้ {selectedCount} รายการ)
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {selectionNote ? (
            <input type="hidden" name="selection_note" value={selectionNote} />
          ) : null}
          <SubmitButton pendingLabel="กำลังสร้างเอกสาร…">
            สร้างทะเบียนรวม PDF
          </SubmitButton>
        </div>
      </div>

      {state.message ? (
        <div className="px-4 pt-3">
          <Alert tone="error" role="alert">
            {state.message}
          </Alert>
        </div>
      ) : null}

      {children}
    </form>
  );
}
