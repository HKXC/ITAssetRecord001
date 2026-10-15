import type { ReactNode } from "react";

import { SignOutButton } from "@/components/layout/SignOutButton";
import { SidebarNav } from "@/components/layout/SidebarNav";

/**
 * Desktop: fixed sidebar with a white content area on the soft green-white surface.
 * Mobile: the sidebar collapses into a <details> drawer, so opening the menu needs no
 * client-side JavaScript beyond the nav's active-state highlighting.
 */
export function AppShell({
  title,
  description,
  actions,
  userEmail,
  children,
}: {
  title: string;
  description?: string;
  actions?: ReactNode;
  userEmail: string | null;
  children: ReactNode;
}) {
  return (
    <div className="flex min-h-screen bg-surface">
      <aside className="hidden w-64 shrink-0 border-r border-line bg-canvas p-4 lg:flex lg:flex-col lg:justify-between">
        <div className="flex flex-col gap-6">
          <div className="flex items-center gap-2 px-2 py-1">
            <span aria-hidden className="grid h-8 w-8 place-items-center rounded-md bg-primary text-on-primary">
              IT
            </span>
            <span className="text-sm font-semibold">ครุภัณฑ์ IT</span>
          </div>
          <SidebarNav />
        </div>
        <div className="flex flex-col gap-2 border-t border-line pt-4">
          <p className="truncate px-2 text-xs text-muted" title={userEmail ?? undefined}>
            {userEmail ?? "ไม่ทราบผู้ใช้"}
          </p>
          <div className="px-2">
            <SignOutButton />
          </div>
        </div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="border-b border-line bg-canvas px-4 py-3 lg:px-8 lg:py-5">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="min-w-0">
              <div className="mb-2 lg:hidden">
                <details className="relative">
                  <summary className="cursor-pointer list-none rounded-md border border-line px-3 py-1.5 text-sm">
                    เมนู
                  </summary>
                  <div className="absolute z-10 mt-2 w-56 rounded-md border border-line bg-canvas p-2 shadow-sm">
                    <SidebarNav variant="inline" />
                    <div className="mt-2 border-t border-line pt-2">
                      <SignOutButton />
                    </div>
                  </div>
                </details>
              </div>
              <h1 className="text-lg font-semibold lg:text-xl">{title}</h1>
              {description ? <p className="mt-1 text-sm text-muted">{description}</p> : null}
            </div>
            {actions ? <div className="flex flex-wrap items-center gap-2">{actions}</div> : null}
          </div>
        </header>

        <main className="flex-1 px-4 py-4 lg:px-8 lg:py-6">{children}</main>
      </div>
    </div>
  );
}
