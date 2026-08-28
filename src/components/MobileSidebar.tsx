"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import * as Icons from "lucide-react";
import { X } from "lucide-react";
import { NAV_ITEMS, hasResourceAccess } from "@/lib/permissions";
import type { UserRole } from "@prisma/client";

export function MobileSidebar({
  open,
  onClose,
  role,
}: {
  open: boolean;
  onClose: () => void;
  role: UserRole;
}) {
  const pathname = usePathname();
  const items = NAV_ITEMS.filter((item) => hasResourceAccess(role, item.resource));

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 md:hidden">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className="absolute left-0 top-0 h-full w-72 bg-turqui-800 text-turqui-50 shadow-xl">
        <div className="flex items-center justify-between border-b border-white/10 px-4 py-4">
          <span className="font-semibold">Choles Team</span>
          <button onClick={onClose} aria-label="Cerrar menu">
            <X className="h-5 w-5" />
          </button>
        </div>
        <nav className="space-y-0.5 px-3 py-4">
          {items.map((item) => {
            const Icon = (Icons as unknown as Record<string, Icons.LucideIcon>)[item.icon] ?? Icons.Circle;
            const active = pathname === item.href || pathname.startsWith(item.href + "/");
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={onClose}
                className={`flex items-center gap-3 rounded-lg px-3 py-2 text-sm ${
                  active ? "bg-white/10 font-medium text-white" : "text-turqui-100"
                }`}
              >
                <Icon className="h-4 w-4 shrink-0" />
                {item.label}
              </Link>
            );
          })}
        </nav>
      </div>
    </div>
  );
}
