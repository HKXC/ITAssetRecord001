import type { ReactNode } from "react";

type Tone = "error" | "success" | "info";

const tones: Record<Tone, string> = {
  error: "border-danger/40 bg-danger-soft text-danger",
  success: "border-primary/40 bg-primary-soft text-primary-hover",
  info: "border-line bg-surface text-ink",
};

export function Alert({
  tone = "info",
  children,
  role = "status",
}: {
  tone?: Tone;
  children: ReactNode;
  role?: "status" | "alert";
}) {
  return (
    <div role={role} className={`rounded-md border px-3 py-2 text-sm ${tones[tone]}`}>
      {children}
    </div>
  );
}

export function EmptyState({
  title,
  description,
  action,
}: {
  title: string;
  description?: string;
  action?: ReactNode;
}) {
  return (
    <div className="flex flex-col items-center gap-3 px-4 py-12 text-center">
      <p className="font-medium text-ink">{title}</p>
      {description ? <p className="max-w-md text-sm text-muted">{description}</p> : null}
      {action}
    </div>
  );
}
