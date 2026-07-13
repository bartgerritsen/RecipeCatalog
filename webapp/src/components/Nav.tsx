"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const LINKS = [
  { href: "/", label: "Tijdlijn" },
  { href: "/browse", label: "Recepten" },
  { href: "/connect", label: "Albert Heijn" },
  { href: "/profile", label: "Profiel" },
];

export default function Nav() {
  const pathname = usePathname();
  return (
    <nav className="nav" aria-label="Hoofdnavigatie">
      {LINKS.map((l) => {
        const active = l.href === "/" ? pathname === "/" : pathname.startsWith(l.href);
        return (
          <Link key={l.href} href={l.href} className={active ? "active" : ""}>
            {l.label}
          </Link>
        );
      })}
    </nav>
  );
}
