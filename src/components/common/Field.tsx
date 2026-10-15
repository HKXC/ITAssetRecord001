import type { ReactNode } from "react";

const controlClass =
  "w-full rounded-md border border-line-strong bg-canvas px-3 py-2 text-sm text-ink placeholder:text-muted/70 focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary";

export function Field({
  label,
  htmlFor,
  required,
  error,
  hint,
  children,
}: {
  label: string;
  htmlFor: string;
  required?: boolean;
  error?: string;
  hint?: string;
  children: ReactNode;
}) {
  return (
    <div className="flex flex-col gap-1">
      <label htmlFor={htmlFor} className="text-sm font-medium text-ink">
        {label}
        {required ? <span className="text-danger"> *</span> : null}
      </label>
      {children}
      {hint && !error ? <p className="text-xs text-muted">{hint}</p> : null}
      {error ? (
        <p id={`${htmlFor}-error`} role="alert" className="text-xs text-danger">
          {error}
        </p>
      ) : null}
    </div>
  );
}

export function TextInput(props: React.ComponentProps<"input"> & { invalid?: boolean }) {
  const { invalid, className = "", ...rest } = props;
  return (
    <input
      {...rest}
      aria-invalid={invalid ? true : undefined}
      className={[controlClass, invalid ? "border-danger" : "", className].filter(Boolean).join(" ")}
    />
  );
}

export function TextArea(props: React.ComponentProps<"textarea"> & { invalid?: boolean }) {
  const { invalid, className = "", ...rest } = props;
  return (
    <textarea
      {...rest}
      aria-invalid={invalid ? true : undefined}
      className={[controlClass, "min-h-24", invalid ? "border-danger" : "", className]
        .filter(Boolean)
        .join(" ")}
    />
  );
}

export function Select(props: React.ComponentProps<"select"> & { invalid?: boolean }) {
  const { invalid, className = "", children, ...rest } = props;
  return (
    <select
      {...rest}
      aria-invalid={invalid ? true : undefined}
      className={[controlClass, invalid ? "border-danger" : "", className].filter(Boolean).join(" ")}
    >
      {children}
    </select>
  );
}

export const fieldControlClass = controlClass;
