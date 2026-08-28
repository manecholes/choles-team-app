"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import * as Icons from "lucide-react";
import { NAV_ITEMS } from "@/lib/permissions";
import type { UserRole } from "@prisma/client";
import { hasResourceAccess } from "@/lib/permissions";

export function Sidebar({ role }: { role: UserRole }) {
  const pathname = usePathname();
  const items = NAV_ITEMS.filter((item) => hasResourceAccess(role, item.resource));

  return (
    <aside className="hidden w-64 shrink-0 flex-col bg-turqui-800 text-turqui-50 md:flex">
      <div className="flex items-center gap-2 border-b border-white/10 px-5 py-5">
        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-choles-red font-bold text-white">
          CT
        </div>
        <div>
          <p className="text-sm font-semibold leading-tight">Choles Team</p>
          <p className="text-[11px] text-turqui-200">Juntos, somos Choles Team.</p>
        </div>
      </div>
      <nav className="flex-1 space-y-0.5 overflow-y-auto px-3 py-4">
        {items.map((item) => {
          const Icon = (Icons as unknown as Record<string, Icons.LucideIcon>)[item.icon] ?? Icons.Circle;
          const active = pathname === item.href || pathname.startsWith(item.href + "/");
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors ${
                active
                  ? "bg-white/10 font-medium text-white"
                  : "text-turqui-100 hover:bg-white/5 hover:text-white"
              }`}
            >
              <Icon className="h-4 w-4 shrink-0" />
              {item.label}
            </Link>
          );
        })}
      </nav>
      <div className="border-t border-white/10 px-4 py-3 text-[11px] text-turqui-300">
        Choles Team App v0.1
      </div>
    </aside>
  );
}
