export default function SkeletonList({ rows = 6 }: { rows?: number }) {
  return (
    <div className="divide-y divide-border rounded-xl border border-border bg-white">
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="flex animate-pulse items-center gap-3 px-4 py-3.5">
          <div className="h-10 w-10 shrink-0 rounded-xl bg-slate-100" />
          <div className="min-w-0 flex-1 space-y-2">
            <div className="h-3.5 w-1/3 rounded bg-slate-100" />
            <div className="h-3 w-1/4 rounded bg-slate-100" />
          </div>
          <div className="h-3 w-16 rounded bg-slate-100" />
        </div>
      ))}
    </div>
  )
}