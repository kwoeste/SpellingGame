"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const LINKS = [
  { href: "/admin", label: "Today" },
  { href: "/admin/progress", label: "Progress" },
  { href: "/admin/knowledge-map", label: "Knowledge map" },
  { href: "/admin/wrong-answers", label: "Wrong answers" },
  { href: "/admin/sessions", label: "Sessions" },
  { href: "/admin/assignments", label: "Assignments" },
  { href: "/admin/inventory", label: "Inventory" },
  { href: "/admin/privacy", label: "Privacy" },
] as const;

export function AdminNav() {
  const pathname = usePathname();
  return (
    <nav className="ad-nav" aria-label="Parent dashboard">
      {LINKS.map((link) => {
        const current = link.href === "/admin" ? pathname === "/admin" : pathname.startsWith(link.href);
        return (
          <Link key={link.href} href={link.href} aria-current={current ? "page" : undefined}>
            {link.label}
          </Link>
        );
      })}
    </nav>
  );
}
