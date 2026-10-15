/**
 * Brand mark used by the public/auth screens.
 *
 * `currentColor` means the surrounding class owns the colour (white in the brand column,
 * emerald in the compact form logo), so one component serves every placement without
 * variant props.
 */

export function BrandIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M4 4h7v7H4zM13 4h7v7h-7zM4 13h7v7H4z" fill="currentColor" opacity="0.9" />
      <path d="M13 13h7v7h-7z" fill="currentColor" opacity="0.45" />
    </svg>
  );
}

/** Renders mark + wordmark; the parent element supplies the flex container and colour. */
export function BrandLockup({ label = "IT ASSET" }: { label?: string }) {
  return (
    <>
      <span className="auth-brand-mark">
        <BrandIcon />
      </span>
      <span>{label}</span>
    </>
  );
}
