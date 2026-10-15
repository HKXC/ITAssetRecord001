"use client";

import { useActionState } from "react";

import type { DocumentActionState } from "@/app/(app)/assets/actions";
import { Alert } from "@/components/common/Alert";
import { SubmitButton } from "@/components/common/SubmitButton";

/**
 * Triggers a document action and shows a Thai error inline when it fails, instead of
 * dumping the user on an error page. Generation failures never lose asset data, so
 * retrying from here is always safe.
 */
export function DocumentActionButton({
  action,
  fieldName,
  fieldValue,
  label,
  pendingLabel,
  variant = "primary",
  size = "md",
}: {
  action: (state: DocumentActionState, formData: FormData) => Promise<DocumentActionState>;
  fieldName: string;
  fieldValue: string;
  label: string;
  pendingLabel: string;
  variant?: "primary" | "secondary" | "ghost" | "danger";
  size?: "sm" | "md";
}) {
  const [state, formAction] = useActionState(action, {
    status: "idle" as const,
    message: null,
  });

  return (
    <form action={formAction} className="flex flex-col gap-2">
      <input type="hidden" name={fieldName} value={fieldValue} />
      <SubmitButton variant={variant} size={size} pendingLabel={pendingLabel}>
        {label}
      </SubmitButton>
      {state.message ? (
        <Alert tone="error" role="alert">
          {state.message}
        </Alert>
      ) : null}
    </form>
  );
}
