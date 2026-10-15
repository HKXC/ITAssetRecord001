"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

export type NavItem = {
  href: string;
  label: string;
  icon: string;
};

export const NAV_ITEMS: NavItem[] = [
  { href: "/", label: "ภาพรวม", icon: "▦" },
  { href: "/assets", label: "ครุภัณฑ์", icon: "▤" },
  { href: "/documents", label: "เอกสาร", icon: "▧" },
  { href: "/settings/asset-types", label: "ตั้งค่าประเภท", icon: "⚙" },
];

function isActive(pathname: string, href: string) {
  if (href === "/") return pathname === "/";
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function SidebarNav({ variant = "sidebar" }: { variant?: "sidebar" | "inline" }) {
  const pathname = usePathname();

  if (variant === "inline") {
    return (
      <ul className="flex flex-col gap-1">
        {NAV_ITEMS.map((item) => (
          <li key={item.href}>
            <Link
              href={item.href}
              className={`block rounded-md px-3 py-2 text-sm ${                  isActive(pathname, item.href)
                    ? "bg-primary text-on-primary"
                  : "text-ink hover:bg-primary-soft"
              }`}
            >
              {item.label}
            </Link>
          </li>
        ))}
      </ul>
    );
  }

  return (
    <ul className="flex flex-col gap-1">
      {NAV_ITEMS.map((item) => {
        const active = isActive(pathname, item.href);
        return (
          <li key={item.href}>
            <Link
              href={item.href}
              aria-current={active ? "page" : undefined}
              className={`flex items-center gap-3 rounded-md px-3 py-2 text-sm ${
                active ? "bg-primary text-on-primary" : "text-ink hover:bg-primary-soft"
              }`}
            >
              <span aria-hidden className={active ? "text-on-primary" : "text-primary"}>
                {item.icon}
              </span>
              {item.label}
            </Link>
          </li>
        );
      })}
    </ul>
  );
}
