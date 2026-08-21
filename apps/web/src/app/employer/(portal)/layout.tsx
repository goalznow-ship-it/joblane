"use client"

import { useEffect, useState } from "react"
import { useRouter, usePathname } from "next/navigation"
import Link from "next/link"
import {
  LayoutDashboard,
  Building2,
  Briefcase,
  Plus,
  Inbox,
  Users,
  LogOut,
  Menu,
  X,
} from "lucide-react"
import { cn } from "@/lib/utils"
import {
  employerApi,
  EmployerApiError,
  type EmployerMe,
} from "@/lib/employer-api"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"

const NAV_ITEMS = [
  { href: "/employer/dashboard", label: "İdarə paneli", icon: LayoutDashboard },
  { href: "/employer/company", label: "Şirkət profili", icon: Building2 },
  { href: "/employer/jobs", label: "Vakansiyalar", icon: Briefcase },
  { href: "/employer/jobs/new", label: "Yeni vakansiya", icon: Plus },
  { href: "/employer/applications", label: "Müraciətlər", icon: Inbox },
  { href: "/employer/team", label: "Komanda", icon: Users },
]

const STATUS_BANNERS: Record<string, { title: string; text: string }> = {
  PENDING: {
    title: "Şirkət təsdiq gözləyir",
    text: "Profiliniz moderator tərəfindən yoxlanılır. Bu müddətdə vakansiyalarınızı hazırlaya bilərsiniz, lakin yayımlanmayacaq.",
  },
  REJECTED: {
    title: "Şirkət profili rədd edilib",
    text: "Profiliniz təsdiq olunmayıb. Dəstək ilə əlaqə saxlayın.",
  },
  SUSPENDED: {
    title: "Şirkət profili dayandırılıb",
    text: "Şirkət hesabınıza müvəqqəti məhdudiyyət tətbiq olunub. Dəstək ilə əlaqə saxlayın.",
  },
  ARCHIVED: {
    title: "Şirkət profili arxivləşdirilib",
    text: "Bu şirkət hesabı artıq aktiv deyil. Dəstək ilə əlaqə saxlayın.",
  },
}

export default function EmployerPortalLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const router = useRouter()
  const pathname = usePathname()
  const [me, setMe] = useState<EmployerMe | null>(null)
  const [loading, setLoading] = useState(true)
  const [denied, setDenied] = useState(false)
  const [mobileOpen, setMobileOpen] = useState(false)

  useEffect(() => {
    let cancelled = false
    employerApi
      .me()
      .then((data) => {
        if (cancelled) return
        setMe(data)
        if (!data.current_company) {
          router.replace("/employer/onboarding")
          return
        }
      })
      .catch((err) => {
        if (cancelled) return
        if (err instanceof EmployerApiError && err.status === 403) {
          setDenied(true)
          return
        }
        const redirect = `/auth/login?redirect=${encodeURIComponent(pathname)}`
        router.replace(redirect)
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [router, pathname])

  if (loading || !me) {
    return (
      <div className="min-h-screen bg-[#F2F6FD]">
        <div className="mx-auto flex max-w-6xl gap-6 p-6">
          <aside className="hidden w-56 shrink-0 lg:block">
            <div className="space-y-2">
              {[1, 2, 3, 4, 5].map((i) => (
                <Skeleton key={i} className="h-10 w-full" />
              ))}
            </div>
          </aside>
          <main className="flex-1 space-y-4">
            <Skeleton className="h-8 w-64" />
            <Skeleton className="h-40 w-full" />
            <Skeleton className="h-40 w-full" />
          </main>
        </div>
      </div>
    )
  }

  const company = me.current_company
  const blockedStatuses = ["REJECTED", "SUSPENDED", "ARCHIVED"]
  const isBlocked = !company || blockedStatuses.includes(company.status)

  if (denied || isBlocked) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#F2F6FD] p-6">
        <div className="w-full max-w-md rounded-2xl border border-border bg-white p-8 text-center">
          <h1 className="mb-2 text-lg font-bold text-slate-800">
            İşəgötürən hesabı məhdudlaşdırılıb
          </h1>
          <p className="mb-6 text-sm text-slate-500">
            Şirkət profiliniz hazırda əlçatan deyil. Dəstək ilə əlaqə saxlayın.
          </p>
          <Button variant="outline" onClick={() => router.push("/")}>
            Ana səhifəyə qayıt
          </Button>
        </div>
      </div>
    )
  }

  const banner = !isBlocked ? STATUS_BANNERS[company.status] : undefined

  const handleLogout = async () => {
    try {
      const { authApi } = await import("@/lib/api")
      await authApi.logout()
    } catch {
      // ignore
    }
    router.replace("/")
  }

  return (
    <div className="min-h-screen bg-[#F2F6FD]">
      <div className="mx-auto flex max-w-6xl">
        {/* Desktop sidebar */}
        <aside className="sticky top-0 hidden h-screen w-56 shrink-0 flex-col border-r border-border bg-white lg:flex">
          <div className="flex items-center gap-2.5 border-b border-border px-4 py-4">
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-brand-600 text-[14px] font-bold text-white">
              J
            </span>
            <div className="min-w-0">
              <p className="truncate text-[13px] font-bold text-slate-800">
                Joblane İşəgötürən
              </p>
              <p className="truncate text-[11px] text-slate-400">
                {company.name}
              </p>
            </div>
          </div>

          <nav className="flex-1 space-y-0.5 overflow-y-auto p-2.5">
            {NAV_ITEMS.map((item) => {
              const active =
                pathname === item.href || pathname.startsWith(`${item.href}/`)
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={cn(
                    "flex h-10 items-center gap-2.5 rounded-lg px-2.5 text-[13px] transition-colors",
                    active
                      ? "bg-brand-50 font-semibold text-brand-700"
                      : "text-slate-600 hover:bg-slate-100"
                  )}
                >
                  <item.icon
                    className={cn(
                      "h-4 w-4",
                      active ? "text-brand-600" : "text-slate-400"
                    )}
                  />
                  {item.label}
                </Link>
              )
            })}
          </nav>

          <div className="border-t border-border p-3">
            <button
              onClick={handleLogout}
              className="flex h-9 w-full items-center gap-2 rounded-lg px-2.5 text-[13px] text-slate-600 transition-colors hover:bg-slate-100"
            >
              <LogOut className="h-4 w-4 text-slate-400" />
              Çıxış
            </button>
          </div>
        </aside>

        {/* Mobile header */}
        <div className="flex min-h-screen flex-1 flex-col">
          <div className="sticky top-0 z-30 flex items-center justify-between border-b border-border bg-white px-4 py-3 lg:hidden">
            <div className="flex items-center gap-2">
              <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-brand-600 text-[13px] font-bold text-white">
                J
              </span>
              <p className="text-[13px] font-bold text-slate-800">
                Joblane İşəgötürən
              </p>
            </div>
            <button
              onClick={() => setMobileOpen((v) => !v)}
              className="rounded-lg p-2 text-slate-600 hover:bg-slate-100"
              aria-label="Menyu"
            >
              {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </button>
          </div>

          {mobileOpen && (
            <nav className="space-y-0.5 border-b border-border bg-white p-2.5 lg:hidden">
              {NAV_ITEMS.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setMobileOpen(false)}
                  className="flex h-10 items-center gap-2.5 rounded-lg px-2.5 text-[13px] text-slate-600 hover:bg-slate-100"
                >
                  <item.icon className="h-4 w-4 text-slate-400" />
                  {item.label}
                </Link>
              ))}
              <button
                onClick={handleLogout}
                className="flex h-10 w-full items-center gap-2.5 rounded-lg px-2.5 text-[13px] text-slate-600 hover:bg-slate-100"
              >
                <LogOut className="h-4 w-4 text-slate-400" />
                Çıxış
              </button>
            </nav>
          )}

          {banner && (
            <div className="border-b border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
              <p className="font-semibold">{banner.title}</p>
              <p className="mt-0.5 text-amber-700">{banner.text}</p>
            </div>
          )}

          <main className="flex-1 p-4 sm:p-6 lg:p-8">{children}</main>
        </div>
      </div>
    </div>
  )
}