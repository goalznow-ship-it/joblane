import { TrendingUp, Layers, Building2 } from "lucide-react"

const kpis = [
  { label: "Yeni elanlar", value: "45", icon: TrendingUp, accent: "text-brand-500", bg: "bg-brand-50" },
  { label: "Aktiv vakansiyalar", value: "3 247", icon: Layers, accent: "text-accent-600", bg: "bg-accent-50" },
  { label: "Yeni şirkətlər", value: "12", icon: Building2, accent: "text-slate-700", bg: "bg-slate-100" },
]

export default function MarketSnapshot() {
  return (
    <div className="rounded-xl border border-border bg-white p-4">
      <h2 className="mb-3 text-[13px] font-semibold text-slate-800">
        Bu gün joblane.az-da
      </h2>
      <ul className="space-y-2">
        {kpis.map((kpi) => (
          <li
            key={kpi.label}
            className="flex items-center gap-3 rounded-lg border border-border/70 bg-slate-50/60 px-3 py-2.5"
          >
            <span
              className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${kpi.bg}`}
            >
              <kpi.icon className={`h-4 w-4 ${kpi.accent}`} />
            </span>
            <span className="flex-1 text-[12.5px] font-medium text-slate-600">
              {kpi.label}
            </span>
            <span className={`text-[14px] font-bold ${kpi.accent}`}>
              {kpi.value}
            </span>
          </li>
        ))}
      </ul>
    </div>
  )
}