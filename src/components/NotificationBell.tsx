"use client";

import { useEffect, useRef, useState } from "react";
import { Bell, CheckCheck } from "lucide-react";

interface Notification {
  id: number;
  title: string;
  body: string;
  relatedUrl: string | null;
  readAt: string | null;
  createdAt: string;
}

export function NotificationBell() {
  const [items, setItems] = useState<Notification[]>([]);
  const [open, setOpen] = useState(false);
  const boxRef = useRef<HTMLDivElement>(null);

  async function load() {
    const res = await fetch("/api/notifications");
    if (!res.ok) return;
    const data = await res.json();
    setItems(data.notifications ?? []);
  }

  useEffect(() => {
    load();
    const interval = setInterval(load, 60000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (boxRef.current && !boxRef.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const unread = items.filter((n) => !n.readAt).length;

  async function markOne(n: Notification) {
    if (n.readAt) return;
    await fetch(`/api/notifications/${n.id}/read`, { method: "POST" });
    setItems((prev) => prev.map((i) => (i.id === n.id ? { ...i, readAt: new Date().toISOString() } : i)));
  }

  async function markAll() {
    await fetch("/api/notifications", { method: "PATCH" });
    setItems((prev) => prev.map((i) => ({ ...i, readAt: i.readAt ?? new Date().toISOString() })));
  }

  return (
    <div className="relative" ref={boxRef}>
      <button
        onClick={() => setOpen((o) => !o)}
        className="relative rounded-lg p-2 text-slate-500 hover:bg-slate-100"
        title="Notificaciones"
      >
        <Bell className="h-5 w-5" />
        {unread > 0 && (
          <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-[1rem] items-center justify-center rounded-full bg-choles-red px-1 text-[10px] font-bold text-white">
            {unread > 9 ? "9+" : unread}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 z-20 mt-2 w-80 rounded-xl border border-slate-100 bg-white shadow-lg">
          <div className="flex items-center justify-between border-b border-slate-100 px-3 py-2">
            <span className="text-sm font-semibold text-slate-700">Notificaciones</span>
            {unread > 0 && (
              <button onClick={markAll} className="flex items-center gap-1 text-xs text-turqui-600 hover:underline">
                <CheckCheck className="h-3 w-3" /> Marcar todas
              </button>
            )}
          </div>
          <div className="thin-scrollbar max-h-80 overflow-y-auto">
            {items.length === 0 && <p className="px-3 py-6 text-center text-sm text-slate-400">Sin notificaciones.</p>}
            {items.map((n) => (
              <button
                key={n.id}
                onClick={() => markOne(n)}
                className={`block w-full border-b border-slate-50 px-3 py-2 text-left text-sm hover:bg-slate-50 ${
                  n.readAt ? "text-slate-500" : "bg-turqui-50/50 font-medium text-slate-800"
                }`}
              >
                <p>{n.title}</p>
                <p className="mt-0.5 text-xs text-slate-400">{n.body}</p>
                <p className="mt-0.5 text-[10px] text-slate-300">{new Date(n.createdAt).toLocaleString("es-CO")}</p>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
