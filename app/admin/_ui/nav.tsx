"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const LINKS = [
  { href: "/admin", label: "Today" },
  { href: "/admin/progress", label: "Progress" },
  { href: "/admin/knowledge-map", label: "Skills map" },
  { href: "/admin/wrong-answers", label: "Missed questions" },
  { href: "/admin/sessions", label: "Study history" },
  { href: "/admin/learns-best", label: "How she learns" },
  { href: "/admin/assignments", label: "Assignments" },
  { href: "/admin/inventory", label: "Shop supplies" },
  { href: "/admin/privacy", label: "Privacy" },
] as const;

export function AdminNav() {
  const pathname = usePathname();
  return (
    <nav className="pd-nav" aria-label="Parent dashboard">
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
