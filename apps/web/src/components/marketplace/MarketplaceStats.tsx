const stats = [
  { label: "Günlük", value: "45", accent: "text-blue-600" },
  { label: "Həftəlik", value: "318", accent: "text-slate-800" },
  { label: "Aylıq", value: "1 233", accent: "text-emerald-600" },
]

export default function MarketplaceStats() {
  return (
    <div className="rounded-lg border border-border bg-white p-4">
      <h2 className="mb-3 text-[13px] font-semibold text-slate-800">
        Saytda dərc edilmiş vakansiyaların sayı
      </h2>
      <div className="grid grid-cols-3 gap-2">
        {stats.map((s) => (
          <div
            key={s.label}
            className="flex flex-col items-center rounded-md border border-border/70 bg-slate-50 px-1 py-2.5"
          >
            <span className={`text-lg font-bold leading-none ${s.accent}`}>
              {s.value}
            </span>
            <span className="mt-1 text-[10px] uppercase tracking-wide text-slate-400">
              {s.label}
            </span>
          </div>
        ))}
      </div>
    </div>
  )
}