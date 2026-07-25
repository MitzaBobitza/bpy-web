"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { cn } from "@/lib/cn";
import type { AdminCapabilities } from "@/lib/bancho/admin-types";
import { allowedSections } from "@/lib/osu/admin";

/**
 * Admin navigation, showing only the sections the signed-in staff member's
 * privileges allow. The API enforces the same boundaries, so a hidden
 * section is unreachable rather than merely invisible.
 */
export function AdminNav({ capabilities }: { capabilities: AdminCapabilities }) {
  const pathname = usePathname();
  const sections = allowedSections(capabilities);

  return (
    <nav aria-label="Admin sections">
      <p className="eyebrow">Staff area</p>
      <ul className="mt-3 space-y-0.5">
        <li>
          <NavLink href="/admin" label="Overview" active={pathname === "/admin"} />
        </li>
        {sections.map((section) => (
          <li key={section.href}>
            <NavLink
              href={section.href}
              label={section.label}
              active={pathname === section.href || pathname.startsWith(`${section.href}/`)}
            />
          </li>
        ))}
      </ul>

      <p className="mt-6 border-t border-line pt-4 text-xs leading-relaxed text-faint">
        Actions here are the same ones the in-game commands perform, and are
        recorded in the audit log under your name.
      </p>
    </nav>
  );
}

function NavLink({
  href,
  label,
  active,
}: {
  href: string;
  label: string;
  active: boolean;
}) {
  return (
    <Link
      href={href}
      aria-current={active ? "page" : undefined}
      className={cn(
        "block rounded-md px-3 py-2 text-sm font-semibold transition",
        active ? "bg-violet/15 text-violet" : "text-dim hover:bg-surface-2 hover:text-ink",
      )}
    >
      {label}
    </Link>
  );
}
