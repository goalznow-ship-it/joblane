"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { adminApi, type DashboardData, type AdminMe } from "@/lib/admin-api"
import {
  Briefcase,
  Building2,
  Users,
  Megaphone,
  Star,
  Flame,
  ArrowUp,
  Eye,
  Loader2,
  ArrowRight,
  Database,
  Server,
  Mail,
  Cpu,
} from "lucide-react"

const STATUS_LABELS: Record<string, string> = {
  PENDING_REVIEW: "Gözləmədə",
  APPROVED: "Təsdiqlənib",
  REJECTED: "Rədd edilib",
  PUBLISHED: "Yayımlanıb",
  PAUSED: "Dayandırılıb",
  DRAFT: "Qaralama",
  ARCHIVED: "Arxivləşib",
  EXPIRED: "Vaxtı bitib",
}

const STATUS_COLORS: Record<string, string> = {
  PENDING_REVIEW: "bg-amber-100 text-amber-700",
  APPROVED: "bg-emerald-100 text-emerald-700",
  REJECTED: "bg-red-100 text-red-700",
  PUBLISHED: "bg-blue-100 text-blue-700",
  PAUSED: "bg-slate-100 text-slate-600",
  DRAFT: "bg-slate-100 text-slate-600",
  ARCHIVED: "bg-slate-100 text-slate-500",
  EXPIRED: "bg-slate-100 text-slate-500",
}

function formatDate(iso: string | null): string {
  if (!iso) return "—"
  return new Date(iso).toLocaleDateString("az-AZ", { day: "2-digit", month: "short", year: "numeric" })
}

export default function AdminDashboardPage() {
  const [data, setData] = useState<DashboardData | null>(null)
  const [me, setMe] = useState<AdminMe | null>(null)
  const [error, setError] = useState("")

  useEffect(() => {
    adminApi
      .me()
      .then(setMe)
      .catch(() => setMe(null))
    adminApi
      .dashboard()
      .then(setData)
      .catch((err) => setError(String(err)))
  }, [])

  if (error) {
    return <div className="rounded-xl border border-red-200 bg-red-50 p-6 text-sm text-red-700">Xəta: {error}</div>
  }

  if (!data) {
    return (
      <div className="flex h-64 items-center justify-center text-muted-foreground">
        <Loader2 className="mr-2 h-5 w-5 animate-spin text-[#2563EB]" />
        Dashboard yüklənir...
      </div>
    )
  }

  const { jobs, companies, users, ads, moderation_queue, recent_audit, system_status } = data

  const kpis = [
    { label: "Cəmi vakansiya", value: jobs.total, icon: Briefcase, color: "text-blue-600 bg-blue-50" },
    { label: "Şirkətlər", value: companies.total, icon: Building2, color: "text-teal-600 bg-teal-50" },
    { label: "İstifadəçilər", value: users.total, icon: Users, color: "text-violet-600 bg-violet-50" },
    { label: "Aktiv reklamlar", value: ads.total, icon: Megaphone, color: "text-orange-600 bg-orange-50" },
  ]

  const promoRow = [
    { label: "Premium", value: jobs.premium, icon: Star, color: "text-amber-600" },
    { label: "Featured", value: jobs.featured, icon: ArrowUp, color: "text-blue-600" },
    { label: "Təcili", value: jobs.urgent, icon: Flame, color: "text-red-600" },
  ]

  const sys = [
    { label: "API", key: "api", icon: Server },
    { label: "PostgreSQL", key: "database", icon: Database },
    { label: "Redis", key: "redis", icon: Cpu },
    { label: "Mail", key: "mail", icon: Mail },
  ]

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Dashboard</h1>
          <p className="mt-1 text-sm text-slate-500">
            Xoş gəlmisiniz{me?.full_name ? `, ${me.full_name}` : ""} — JOBLANE.AZ idarəetmə paneli
          </p>
        </div>
        <Link
          href="/admin/listings"
          className="flex items-center gap-2 rounded-lg bg-[#2563EB] px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-[#1D4ED8]"
        >
          <Briefcase className="h-4 w-4" />
          Vakansiyalar
        </Link>
      </div>

      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 xl:grid-cols-4">
        {kpis.map((kpi) => {
          const Icon = kpi.icon
          return (
            <div key={kpi.label} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-sm text-slate-500">{kpi.label}</div>
                  <div className="mt-1 text-3xl font-bold text-slate-900">{kpi.value}</div>
                </div>
                <div className={`flex h-11 w-11 items-center justify-center rounded-xl ${kpi.color}`}>
                  <Icon className="h-5 w-5" />
                </div>
              </div>
            </div>
          )
        })}
      </div>

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-3">
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm lg:col-span-2">
          <h2 className="mb-4 text-sm font-bold text-slate-900">Vakansiya statusları</h2>
          <div className="flex flex-wrap gap-2">
            {Object.entries(jobs.by_status).map(([status, count]) => (
              <div key={status} className="flex items-center gap-2 rounded-lg bg-slate-50 px-3 py-2">
                <span className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${STATUS_COLORS[status] || "bg-slate-100 text-slate-600"}`}>
                  {STATUS_LABELS[status] || status}
                </span>
                <span className="text-sm font-bold text-slate-800">{count}</span>
              </div>
            ))}
          </div>
          <div className="mt-5 grid grid-cols-3 gap-4 border-t border-slate-100 pt-5">
            {promoRow.map((p) => {
              const Icon = p.icon
              return (
                <div key={p.label} className="flex items-center gap-3">
                  <Icon className={`h-5 w-5 ${p.color}`} />
                  <div>
                    <div className="text-sm text-slate-500">{p.label}</div>
                    <div className="text-lg font-bold text-slate-900">{p.value}</div>
                  </div>
                </div>
              )
            })}
          </div>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="mb-4 text-sm font-bold text-slate-900">Sistem vəziyyəti</h2>
          <div className="space-y-3">
            {sys.map((s) => {
              const Icon = s.icon
              const ok = system_status?.[s.key] === true
              const status = system_status?.[s.key]
              return (
                <div key={s.key} className="flex items-center justify-between">
                  <div className="flex items-center gap-2.5 text-sm text-slate-600">
                    <Icon className="h-4 w-4 text-slate-400" />
                    {s.label}
                  </div>
                  {status === undefined ? (
                    <span className="text-xs text-slate-400">məlumat yoxdur</span>
                  ) : ok ? (
                    <span className="rounded-full bg-emerald-100 px-2.5 py-0.5 text-[11px] font-semibold text-emerald-700">
                      Aktiv
                    </span>
                  ) : (
                    <span className="rounded-full bg-red-100 px-2.5 py-0.5 text-[11px] font-semibold text-red-700">
                      Xəta
                    </span>
                  )}
                </div>
              )
            })}
          </div>
          <div className="mt-4 border-t border-slate-100 pt-4 text-xs text-slate-400">
            Son yenilənmə: {new Date().toLocaleTimeString("az-AZ")}
          </div>
        </div>
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="flex items-center justify-between border-b border-slate-100 px-6 py-4">
          <h2 className="text-sm font-bold text-slate-900">Moderasiya növbəsi</h2>
          <Link href="/admin/listings?status=PENDING_REVIEW" className="flex items-center gap-1 text-xs font-semibold text-[#2563EB] hover:underline">
            Hamısı <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </div>
        {moderation_queue.length === 0 ? (
          <div className="flex items-center justify-center gap-2 px-6 py-10 text-sm text-slate-400">
            <Eye className="h-4 w-4" /> Yoxlanılacaq vakansiya yoxdur
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-slate-100 text-xs uppercase tracking-wider text-slate-400">
                  <th className="px-6 py-3 font-semibold">Vakansiya</th>
                  <th className="px-4 py-3 font-semibold">Şirkət</th>
                  <th className="px-4 py-3 font-semibold">Yerləşmə</th>
                  <th className="px-4 py-3 font-semibold">Tarix</th>
                  <th className="px-4 py-3 font-semibold">Status</th>
                  <th className="px-6 py-3" />
                </tr>
              </thead>
              <tbody>
                {moderation_queue.map((job) => (
                  <tr key={job.id} className="border-b border-slate-50 last:border-0 hover:bg-slate-50/60">
                    <td className="max-w-[300px] px-6 py-3.5">
                      <div className="truncate font-semibold text-slate-900">{job.title}</div>
                    </td>
                    <td className="px-4 py-3.5 text-slate-600">{job.company_name || "—"}</td>
                    <td className="px-4 py-3.5 text-slate-600">{job.location || "—"}</td>
                    <td className="px-4 py-3.5 text-slate-500">{formatDate(job.created_at)}</td>
                    <td className="px-4 py-3.5">
                      <span className={`rounded-full px-2.5 py-1 text-[11px] font-semibold ${STATUS_COLORS[job.status] || "bg-slate-100 text-slate-600"}`}>
                        {STATUS_LABELS[job.status] || job.status}
                      </span>
                    </td>
                    <td className="px-6 py-3.5 text-right">
                      <Link href={`/admin/listings/${job.id}`} className="text-xs font-semibold text-[#2563EB] hover:underline">
                        Bax →
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="border-b border-slate-100 px-6 py-4">
          <h2 className="text-sm font-bold text-slate-900">Son audit əməliyyatları</h2>
        </div>
        {recent_audit.length === 0 ? (
          <div className="px-6 py-8 text-center text-sm text-slate-400">Audit qeydi yoxdur</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-slate-100 text-xs uppercase tracking-wider text-slate-400">
                  <th className="px-6 py-3 font-semibold">Əməliyyat</th>
                  <th className="px-4 py-3 font-semibold">İcra edən</th>
                  <th className="px-4 py-3 font-semibold">IP</th>
                  <th className="px-6 py-3 font-semibold">Vaxt</th>
                </tr>
              </thead>
              <tbody>
                {recent_audit.map((entry) => (
                  <tr key={entry.id} className="border-b border-slate-50 last:border-0">
                    <td className="px-6 py-3">
                      <code className="rounded bg-slate-100 px-2 py-1 text-xs font-medium text-slate-700">{entry.action}</code>
                    </td>
                    <td className="px-4 py-3 text-slate-600">{entry.actor_email || "—"}</td>
                    <td className="px-4 py-3 font-mono text-xs text-slate-500">{entry.ip_address || "—"}</td>
                    <td className="px-6 py-3 text-slate-500">{new Date(entry.created_at).toLocaleString("az-AZ")}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}