"use client";

import { useFormStatus } from "react-dom";

import { Button } from "@/components/common/Button";

/**
 * Disables itself while the enclosing form action is pending, which prevents the
 * double-submit that would otherwise create two documents.
 */
export function SubmitButton({
  children,
  pendingLabel,
  variant = "primary",
  size = "md",
  name,
  value,
  className = "",
}: {
  children: React.ReactNode;
  pendingLabel?: string;
  variant?: "primary" | "secondary" | "ghost" | "danger";
  size?: "sm" | "md";
  name?: string;
  value?: string;
  className?: string;
}) {
  const { pending } = useFormStatus();

  return (
    <Button
      type="submit"
      variant={variant}
      size={size}
      name={name}
      value={value}
      disabled={pending}
      className={className}
      aria-busy={pending}
    >
      {pending && pendingLabel ? pendingLabel : children}
    </Button>
  );
}
