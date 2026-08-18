import { cn } from "@/lib/utils"

export default function PremiumBadge({
  label = "Seçilmiş",
  className,
}: {
  label?: string
  className?: string
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full bg-brand-50 px-2 py-0.5 text-[10px] font-semibold text-brand-600 ring-1 ring-inset ring-brand-500/15",
        className
      )}
    >
      <svg
        className="h-2.5 w-2.5 text-brand-500"
        viewBox="0 0 24 24"
        fill="currentColor"
        aria-hidden="true"
      >
        <path d="M12 2l2.4 6.9L21.5 9l-5.6 4.4 1.9 7L12 16.5 6.2 20.4l1.9-7L2.5 9l7.1-.1L12 2z" />
      </svg>
      {label}
    </span>
  )
}