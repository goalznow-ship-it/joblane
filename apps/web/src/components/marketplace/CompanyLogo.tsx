import { cn } from "@/lib/utils"

const LOGO_COLORS = [
  "bg-brand-500",
  "bg-brand-500",
  "bg-violet-600",
  "bg-accent-600",
  "bg-cyan-700",
  "bg-rose-600",
  "bg-gold",
  "bg-emerald-600",
  "bg-slate-700",
  "bg-blue-700",
]

function colorFor(seed: string): string {
  let hash = 0
  for (let i = 0; i < seed.length; i++) {
    hash = (hash * 31 + seed.charCodeAt(i)) | 0
  }
  return LOGO_COLORS[Math.abs(hash) % LOGO_COLORS.length]
}

export function initialsOf(name: string): string {
  const parts = name
    .replace(/(PASHA|SOCAR|ABB|AZAL|Nar|ABB)/g, "")
    .trim()
    .split(/\s+/)
    .filter(Boolean)
  if (parts.length === 0) return name.slice(0, 2).toUpperCase()
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase()
  return (parts[0][0] + parts[1][0]).toUpperCase()
}

export default function CompanyLogo({
  name,
  className,
  rounded = "rounded-lg",
}: {
  name: string
  className?: string
  rounded?: string
}) {
  return (
    <div
      className={cn(
        "flex items-center justify-center font-bold text-white select-none shrink-0",
        colorFor(name),
        rounded,
        className
      )}
      aria-label={name}
    >
      <span className="text-[0.85em] leading-none">{initialsOf(name)}</span>
    </div>
  )
}