import type { LucideIcon } from "lucide-react"
import { cn } from "@/lib/utils"

export default function EmptyState({
  icon: Icon,
  title,
  subtitle,
  className,
}: {
  icon: LucideIcon
  title: string
  subtitle?: string
  className?: string
}) {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center rounded-xl border border-dashed border-border bg-white px-6 py-14 text-center",
        className
      )}
    >
      <span className="flex h-11 w-11 items-center justify-center rounded-full bg-slate-50 text-slate-400">
        <Icon className="h-5 w-5" />
      </span>
      <p className="mt-3 text-[14px] font-semibold text-slate-700">{title}</p>
      {subtitle && <p className="mt-1 text-[12px] text-slate-400">{subtitle}</p>}
    </div>
  )
}