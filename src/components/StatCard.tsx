import type { LucideIcon } from "lucide-react";

export function StatCard({
  label,
  value,
  icon: Icon,
  tone = "turqui",
  hint,
}: {
  label: string;
  value: string | number;
  icon: LucideIcon;
  tone?: "turqui" | "red" | "green" | "yellow";
  hint?: string;
}) {
  const toneClasses: Record<string, string> = {
    turqui: "bg-turqui-50 text-turqui-700",
    red: "bg-red-50 text-choles-red",
    green: "bg-green-50 text-green-700",
    yellow: "bg-yellow-50 text-yellow-700",
  };

  return (
    <div className="card flex items-start justify-between">
      <div>
        <p className="text-xs font-medium uppercase tracking-wide text-slate-400">{label}</p>
        <p className="mt-1 text-2xl font-bold text-slate-800">{value}</p>
        {hint && <p className="mt-1 text-xs text-slate-400">{hint}</p>}
      </div>
      <div className={`rounded-xl p-2.5 ${toneClasses[tone]}`}>
        <Icon className="h-5 w-5" />
      </div>
    </div>
  );
}
