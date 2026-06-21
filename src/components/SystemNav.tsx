"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

// Bottom System nav (PLAN v2.6) — glowing tabs: Status · Quests · Inventory ·
// Equipment · Log. Hidden on the auth screen. Inherits the Monarch skin via the
// cascading theme tokens when present higher in the tree.
const TABS = [
  { href: "/", label: "STATUS", icon: "◈" },
  { href: "/quests", label: "QUESTS", icon: "⚔" },
  { href: "/leaderboard", label: "GUILD", icon: "♟" },
  { href: "/inventory", label: "VAULT", icon: "▦" },
  { href: "/equipment", label: "EQUIP", icon: "🜍" },
  { href: "/journal", label: "LOG", icon: "✎" },
] as const;

export default function SystemNav() {
  const pathname = usePathname();
  // Hidden on the auth screen and on public, logged-out profile pages.
  if (pathname === "/login" || pathname.startsWith("/h/")) return null;

  return (
    <nav className="fixed inset-x-0 bottom-0 z-40 border-t border-system/25 bg-bg/85 backdrop-blur-md">
      <ul className="mx-auto flex max-w-3xl items-stretch">
        {TABS.map((t) => {
          const active = t.href === "/" ? pathname === "/" : pathname.startsWith(t.href);
          return (
            <li key={t.href} className="flex-1">
              <Link
                href={t.href}
                className="flex flex-col items-center gap-0.5 py-2.5 text-[9px] tracking-[0.18em] transition"
                style={{
                  color: active ? "var(--system)" : "color-mix(in srgb, var(--system) 45%, transparent)",
                  textShadow: active ? "0 0 8px var(--system)" : "none",
                  borderTop: active ? "2px solid var(--system)" : "2px solid transparent",
                }}
              >
                <span className="text-base leading-none">{t.icon}</span>
                {t.label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
