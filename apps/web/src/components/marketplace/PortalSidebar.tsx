"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import {
  Home,
  Briefcase,
  Building2,
  FolderOpen,
  GraduationCap,
  BookOpen,
  Heart,
  Plus,
  Send,
  LayoutDashboard,
} from "lucide-react"
import { cn } from "@/lib/utils"

const groups: {
  title: string
  items: { href: string; label: string; icon: typeof Home }[]
}[] = [
  {
    title: "İş axtar",
    items: [
      { href: "/", label: "Ana səhifə", icon: Home },
      { href: "/jobs", label: "Vakansiyalar", icon: Briefcase },
      { href: "/companies", label: "Şirkətlər", icon: Building2 },
      { href: "/categories", label: "Kateqoriyalar", icon: FolderOpen },
    ],
  },
  {
    title: "Karyera",
    items: [
      { href: "/internships", label: "Təcrübə proqramları", icon: GraduationCap },
      { href: "/trainings", label: "Təlimlər", icon: BookOpen },
      { href: "/saved", label: "Seçilmişlər", icon: Heart },
    ],
  },
  {
    title: "İşəgötürən",
    items: [
      { href: "/employer/onboarding", label: "Elan yerləşdir", icon: Plus },
      { href: "/employer/dashboard", label: "Şirkət kabineti", icon: LayoutDashboard },
    ],
  },
]

function GroupItem({
  href,
  label,
  icon: Icon,
  active,
}: {
  href: string
  label: string
  icon: typeof Home
  active: boolean
}) {
  return (
    <Link
      href={href}
      className={cn(
        "group flex h-10 items-center gap-2.5 rounded-lg pl-2.5 pr-2 text-[13px] transition-colors duration-150",
        active
          ? "bg-brand-50/70 font-semibold text-brand-700"
          : "text-slate-600 hover:bg-slate-100/80 hover:text-slate-800"
      )}
    >
      <Icon
        className={cn(
          "h-4 w-4 shrink-0 transition-colors duration-150",
          active
            ? "text-brand-600"
            : "text-slate-400 group-hover:text-brand-500"
        )}
      />
      <span className="truncate">{label}</span>
    </Link>
  )
}

export default function PortalSidebar() {
  const pathname = usePathname()

  return (
    <aside className="hidden w-[190px] shrink-0 flex-col border-r border-border bg-[#F2F6FD] lg:flex">
      <div className="flex flex-1 flex-col gap-4 overflow-y-auto px-2.5 py-4">
        <div className="flex items-center gap-2.5 rounded-xl border border-brand-100 bg-white px-2.5 py-2.5">
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-brand-500 text-[14px] font-bold text-white">
            J
          </span>
          <div className="min-w-0">
            <p className="truncate text-[13px] font-semibold text-slate-800">joblane.az</p>
            <p className="text-[10px] uppercase tracking-wide text-slate-400">
              İş marketi
            </p>
          </div>
        </div>

        {groups.map((group) => (
          <nav key={group.title} className="space-y-0.5">
            <p className="px-2.5 pb-1 pt-0.5 text-[10px] font-bold uppercase tracking-widest text-slate-500">
              {group.title}
            </p>
            {group.items.map((item) => (
              <GroupItem
                key={item.href}
                {...item}
                active={pathname === item.href}
              />
            ))}
          </nav>
        ))}

        <div className="mt-auto space-y-3">
          <div className="rounded-xl border border-brand-100 bg-gradient-to-br from-brand-600 to-brand-800 p-3.5 text-white">
            <p className="mb-1 flex items-center gap-1.5 text-[12px] font-bold">
              <Send className="h-3.5 w-3.5" />
              Kateqoriyalara abunə ol
            </p>
            <p className="mb-2.5 text-[11px] leading-snug text-brand-100">
              Yeni vakansiyalar birbaşa e-poçtuna gəlsin
            </p>
            <form className="flex gap-1.5" onSubmit={(e) => e.preventDefault()}>
              <input
                type="email"
                placeholder="e-poçt ünvanı"
                className="w-full min-w-0 rounded-lg border border-white/20 bg-white/10 px-3 py-1.5 text-xs text-white placeholder:text-brand-200 focus:border-white/50 focus:outline-none"
              />
              <button
                type="submit"
                className="shrink-0 rounded-lg bg-white px-3 py-1.5 text-xs font-bold text-brand-600 transition-colors duration-150 hover:bg-brand-50"
              >
                Göndər
              </button>
            </form>
          </div>

          <div className="flex items-center gap-2.5 rounded-xl border border-border bg-white px-2.5 py-2.5">
            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-slate-100 text-[12px] font-bold text-slate-500">
              Q
            </span>
            <div className="min-w-0 flex-1">
              <p className="truncate text-[12px] font-semibold text-slate-700">
                Qonaq istifadəçi
              </p>
              <Link
                href="/auth/login"
                className="text-[11px] font-medium text-brand-500 hover:text-brand-600 hover:underline"
              >
                Daxil ol / Qeydiyyat
              </Link>
            </div>
          </div>
        </div>
      </div>
    </aside>
  )
}