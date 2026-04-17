"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LayoutDashboard, Sparkles } from "lucide-react";

const menuItems = [
  {
    href: "/superadmin",
    label: "Dashboard",
    Icon: LayoutDashboard,
  },
  {
    href: "/superadmin/agent-permissions",
    label: "Agent AI Permission",
    Icon: Sparkles,
  },
];

export default function SuperadminLeftMenu() {
  const pathname = usePathname();

  return (
    <aside className="lg:sticky lg:top-20 h-fit rounded-xl border border-slate-200/70 bg-white p-3 shadow-sm">
      <p className="px-2 pb-2 text-[10px] font-bold uppercase tracking-wider text-slate-400">
        Super Admin
      </p>
      <nav className="space-y-1">
        {menuItems.map(({ href, label, Icon }) => {
          const active = pathname === href;
          return (
            <Link
              key={href}
              href={href}
              className={`flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-semibold transition-colors ${
                active
                  ? "bg-[#1E88E5]/10 text-[#1E88E5]"
                  : "text-slate-600 hover:bg-slate-100"
              }`}
            >
              <Icon className="h-4 w-4" />
              <span>{label}</span>
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}
