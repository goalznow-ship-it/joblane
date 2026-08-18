"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { usePathname, useRouter } from "next/navigation"
import { adminApi, type AdminMe } from "@/lib/admin-api"
import {
  LayoutDashboard,
  Briefcase,
  Building2,
  Users,
  FileText,
  FolderTree,
  Factory,
  MapPin,
  GraduationCap,
  School,
  Megaphone,
  Rocket,
  CreditCard,
  ShieldAlert,
  ScrollText,
  Settings,
  LogOut,
  Loader2,
} from "lucide-react"
import { cn } from "@/lib/utils"

const NAV_ITEMS = [
  { href: "/admin", label: "Dashboard", icon: LayoutDashboard },
  { href: "/admin/listings", label: "Vakansiyalar", icon: Briefcase },
  { href: "/admin/companies", label: "Şirkətlər", icon: Building2, disabled: true },
  { href: "/admin/users", label: "İstifadəçilər", icon: Users, disabled: true },
  { href: "/admin/applications", label: "Müraciətlər", icon: FileText, disabled: true },
  { href: "/admin/categories", label: "Kateqoriyalar", icon: FolderTree, disabled: true },
  { href: "/admin/industries", label: "Sənayelər", icon: Factory, disabled: true },
  { href: "/admin/regions", label: "Regionlar", icon: MapPin, disabled: true },
  { href: "/admin/internships", label: "Təcrübə proqramları", icon: GraduationCap, disabled: true },
  { href: "/admin/trainings", label: "Təlimlər", icon: School, disabled: true },
  { href: "/admin/ads", label: "Reklamlar", icon: Megaphone, disabled: true },
  { href: "/admin/promotions", label: "Promosiyalar", icon: Rocket, disabled: true },
  { href: "/admin/payments", label: "Ödənişlər", icon: CreditCard, disabled: true },
  { href: "/admin/complaints", label: "Şikayətlər", icon: ShieldAlert, disabled: true },
  { href: "/admin/audit", label: "Audit", icon: ScrollText, disabled: true },
  { href: "/admin/admins", label: "Adminlər", icon: Settings, disabled: true },
]

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const router = useRouter()
  const [me, setMe] = useState<AdminMe | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (pathname === "/admin/login") {
      setLoading(false)
      return
    }
    let cancelled = false
    adminApi
      .me()
      .then((data) => {
        if (cancelled) return
        setMe(data)
      })
      .catch(() => {
        if (cancelled) return
        router.replace("/admin/login")
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [router, pathname])

  if (pathname === "/admin/login") {
    return children
  }

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#F5F7FB]">
        <div className="flex flex-col items-center gap-3 text-muted-foreground">
          <Loader2 className="h-8 w-8 animate-spin text-[#2563EB]" />
          <span className="text-sm">Yüklənir...</span>
        </div>
      </div>
    )
  }

  if (!me) return null

  return (
    <div className="min-h-screen bg-[#F5F7FB]">
      <aside className="fixed inset-y-0 left-0 z-40 flex w-64 flex-col border-r border-slate-200 bg-white">
        <div className="flex h-16 items-center gap-2.5 border-b border-slate-200 px-5">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-[#2563EB] text-base font-bold text-white">
            J
          </div>
          <div>
            <div className="text-sm font-bold leading-tight text-slate-900">Joblane Admin</div>
            <div className="text-[11px] leading-tight text-slate-400">İdarəetmə paneli</div>
          </div>
        </div>

        <nav className="flex-1 overflow-y-auto px-3 py-4">
          <div className="mb-2 px-3 text-[11px] font-semibold uppercase tracking-wider text-slate-400">
            Əsas
          </div>
          <ul className="space-y-1">
            {NAV_ITEMS.map((item) => {
              const active = item.href === "/admin" ? pathname === "/admin" : pathname.startsWith(item.href)
              const Icon = item.icon
              if (item.disabled) {
                return (
                  <li key={item.href}>
                    <span className="flex cursor-not-allowed items-center gap-3 rounded-lg px-3 py-2 text-sm text-slate-400">
                      <Icon className="h-4 w-4 shrink-0" />
                      {item.label}
                    </span>
                  </li>
                )
              }
              return (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    className={cn(
                      "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                      active
                        ? "bg-[#2563EB] text-white shadow-sm"
                        : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
                    )}
                  >
                    <Icon className="h-4 w-4 shrink-0" />
                    {item.label}
                  </Link>
                </li>
              )
            })}
          </ul>
        </nav>

        <div className="border-t border-slate-200 p-4">
          <div className="mb-3 flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-full bg-slate-100 text-sm font-bold text-slate-700">
              {(me.full_name || me.email || "A").charAt(0).toUpperCase()}
            </div>
            <div className="min-w-0">
              <div className="truncate text-sm font-semibold text-slate-900">{me.full_name || me.email}</div>
              <div className="text-[11px] text-slate-500">{me.role.replace(/_/g, " ")}</div>
            </div>
          </div>
          <button
            onClick={async () => {
              try {
                await adminApi.logout()
              } catch {
                // ignore
              }
              router.replace("/admin/login")
            }}
            className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium text-slate-600 transition-colors hover:bg-red-50 hover:text-red-600"
          >
            <LogOut className="h-4 w-4" />
            Çıxış
          </button>
        </div>
      </aside>

      <main className="pl-64">
        <div className="mx-auto max-w-[1400px] px-8 py-8">{children}</div>
      </main>
    </div>
  )
}