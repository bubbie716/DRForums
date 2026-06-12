"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { canAccessAdminNavItem } from "@/lib/permissions/requirements";

const NAV_ITEMS = [
  { href: "/admin", label: "Dashboard", icon: "◆", exact: true },
  { href: "/admin/users", label: "Users", icon: "👤" },
  { href: "/admin/bans", label: "Forum Bans", icon: "⛔" },
  { href: "/admin/roles", label: "Roles", icon: "🛡" },
  { href: "/admin/forums", label: "Forum Structure", icon: "📋" },
  { href: "/admin/forms", label: "Forms", icon: "📝" },
  { href: "/admin/maintenance", label: "Maintenance", icon: "🔧" },
  { href: "/admin/settings", label: "Settings", icon: "⚙" },
  { href: "/admin/logs", label: "Logs", icon: "📜" },
];

type AdminSidebarProps = {
  permissions: string[];
};

export function AdminSidebar({ permissions }: AdminSidebarProps) {
  const pathname = usePathname();
  const visibleItems = NAV_ITEMS.filter((item) =>
    canAccessAdminNavItem(permissions, item.href)
  );

  return (
    <aside className="w-full lg:w-64 shrink-0">
      <div className="lg:sticky lg:top-24 bg-white border border-border rounded-2xl shadow-warm overflow-hidden">
        <div className="px-5 py-5 border-b border-border bg-gradient-to-r from-yellow/30 to-cream">
          <Link href="/admin" className="flex items-center gap-3 group">
            <Image
              src="/district-roleplay-logo.png"
              alt="District Roleplay"
              width={36}
              height={36}
              className="rounded-lg shadow-warm"
            />
            <div>
              <p className="font-bold text-text-dark text-sm group-hover:text-accent transition-colors">
                Admin Panel
              </p>
              <p className="text-xs text-text-secondary">District Roleplay</p>
            </div>
          </Link>
        </div>
        <nav className="p-3 space-y-1">
          {visibleItems.map((item) => {
            const active = item.exact
              ? pathname === item.href
              : pathname === item.href || pathname.startsWith(`${item.href}/`);

            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-semibold transition-all duration-200",
                  active
                    ? "bg-gradient-orange text-white shadow-warm"
                    : "text-text-secondary hover:bg-hover hover:text-text-dark"
                )}
              >
                <span className="text-base w-5 text-center" aria-hidden="true">
                  {item.icon}
                </span>
                {item.label}
              </Link>
            );
          })}
        </nav>
        <div className="px-5 py-4 border-t border-border">
          <Link
            href="/"
            className="text-sm font-semibold text-accent hover:text-accent-hover transition-colors"
          >
            ← Back to site
          </Link>
        </div>
      </div>
    </aside>
  );
}
