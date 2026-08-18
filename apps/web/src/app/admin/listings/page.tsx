"use client"

import { useCallback, useEffect, useState } from "react"
import Link from "next/link"
import { useSearchParams, useRouter } from "next/navigation"
import { adminApi, type AdminJob, type JobListResponse } from "@/lib/admin-api"
import { Search, Loader2, ChevronLeft, ChevronRight, Star, ArrowUp, Flame, Eye } from "lucide-react"
import { cn } from "@/lib/utils"

const STATUS_LABELS: Record<string, string> = {
  ALL: "Hamısı",
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

const PAGE_SIZE = 15

export default function AdminListingsPage() {
  const searchParams = useSearchParams()
  const router = useRouter()

  const [q, setQ] = useState(searchParams.get("q") || "")
  const [status, setStatus] = useState(searchParams.get("status") || "ALL")
  const [page, setPage] = useState(1)
  const [sort, setSort] = useState("created_desc")
  const [data, setData] = useState<JobListResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")

  const fetchList = useCallback(() => {
    setLoading(true)
    setError("")
    adminApi
      .listJobs({
        q: q || undefined,
        status: status === "ALL" ? undefined : status,
        page,
        limit: PAGE_SIZE,
        sort,
      })
      .then(setData)
      .catch((err) => setError(String(err)))
      .finally(() => setLoading(false))
  }, [q, status, page, sort])

  useEffect(() => {
    fetchList()
  }, [fetchList])

  useEffect(() => {
    const params = new URLSearchParams()
    if (q) params.set("q", q)
    if (status !== "ALL") params.set("status", status)
    const qs = params.toString()
    router.replace(qs ? `/admin/listings?${qs}` : "/admin/listings", { scroll: false })
  }, [q, status, router])

  const totalPages = data?.total_pages || 1

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Vakansiyalar</h1>
          <p className="mt-1 text-sm text-slate-500">
            {data ? `Cəmi ${data.total} vakansiya` : "Yüklənir..."}
          </p>
        </div>
      </div>

      <div className="flex flex-col gap-4 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm md:flex-row md:items-center">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input
            value={q}
            onChange={(e) => {
              setQ(e.target.value)
              setPage(1)
            }}
            placeholder="Vakansiya üzrə axtar..."
            className="w-full rounded-lg border border-slate-300 bg-white py-2 pl-10 pr-3 text-sm outline-none transition focus:border-[#2563EB] focus:ring-2 focus:ring-blue-100"
          />
        </div>
        <div className="flex items-center gap-2">
          <select
            value={status}
            onChange={(e) => {
              setStatus(e.target.value)
              setPage(1)
            }}
            className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm outline-none focus:border-[#2563EB]"
          >
            {Object.entries(STATUS_LABELS).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
          <select
            value={sort}
            onChange={(e) => {
              setSort(e.target.value)
              setPage(1)
            }}
            className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm outline-none focus:border-[#2563EB]"
          >
            <option value="created_desc">Ən yeni</option>
            <option value="created_asc">Ən köhnə</option>
            <option value="views_desc">Baxış sayı</option>
            <option value="applications_desc">Müraciət sayı</option>
            <option value="salary_desc">Əmək haqqı (yüksək)</option>
          </select>
        </div>
      </div>

      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        {loading ? (
          <div className="flex items-center justify-center gap-2 py-16 text-sm text-slate-400">
            <Loader2 className="h-5 w-5 animate-spin text-[#2563EB]" />
            Yüklənir...
          </div>
        ) : error ? (
          <div className="px-6 py-10 text-sm text-red-600">Xəta: {error}</div>
        ) : !data || data.items.length === 0 ? (
          <div className="px-6 py-16 text-center text-sm text-slate-400">Nəticə tapılmadı</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-slate-100 text-xs uppercase tracking-wider text-slate-400">
                  <th className="px-6 py-3.5 font-semibold">Vakansiya</th>
                  <th className="px-4 py-3.5 font-semibold">Şirkət</th>
                  <th className="px-4 py-3.5 font-semibold">Yerləşmə</th>
                  <th className="px-4 py-3.5 font-semibold">Maaş</th>
                  <th className="px-4 py-3.5 font-semibold">Baxış / Müraciət</th>
                  <th className="px-4 py-3.5 font-semibold">Status</th>
                  <th className="px-6 py-3.5 text-right font-semibold">Əməliyyat</th>
                </tr>
              </thead>
              <tbody>
                {data.items.map((job: AdminJob) => (
                  <tr key={job.id} className="border-b border-slate-50 last:border-0 hover:bg-slate-50/60">
                    <td className="max-w-[280px] px-6 py-4">
                      <div className="flex items-center gap-2">
                        <div className="truncate font-semibold text-slate-900">{job.title}</div>
                        {job.is_premium && <Star className="h-3.5 w-3.5 shrink-0 fill-amber-400 text-amber-400" />}
                        {job.is_featured && <ArrowUp className="h-3.5 w-3.5 shrink-0 text-blue-500" />}
                        {job.is_urgent && <Flame className="h-3.5 w-3.5 shrink-0 text-red-500" />}
                      </div>
                      <div className="mt-0.5 text-xs text-slate-400">
                        {job.employment_type ? job.employment_type.replace(/_/g, " ") : ""}
                        {job.work_mode ? ` · ${job.work_mode.replace(/_/g, " ")}` : ""}
                      </div>
                    </td>
                    <td className="max-w-[180px] truncate px-4 py-4 text-slate-600">{job.company_name || "—"}</td>
                    <td className="max-w-[140px] truncate px-4 py-4 text-slate-600">{job.location || "—"}</td>
                    <td className="px-4 py-4 text-slate-600">
                      {job.salary_min || job.salary_max
                        ? `${job.salary_min ? job.salary_min.toLocaleString("az-AZ") : "—"} – ${job.salary_max ? job.salary_max.toLocaleString("az-AZ") : "—"} ${job.salary_currency || ""}`
                        : "—"}
                    </td>
                    <td className="px-4 py-4 text-slate-500">
                      <span className="inline-flex items-center gap-1">
                        <Eye className="h-3.5 w-3.5" /> {job.views}
                      </span>
                      <span className="ml-3 text-slate-400">· {job.applications_count} müraciət</span>
                    </td>
                    <td className="px-4 py-4">
                      <span className={cn("rounded-full px-2.5 py-1 text-[11px] font-semibold whitespace-nowrap", STATUS_COLORS[job.status] || "bg-slate-100 text-slate-600")}>
                        {STATUS_LABELS[job.status] || job.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <Link href={`/admin/listings/${job.id}`} className="text-xs font-semibold text-[#2563EB] hover:underline">
                        İdarə et →
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {data && data.total > PAGE_SIZE && (
          <div className="flex items-center justify-between border-t border-slate-100 px-6 py-3.5">
            <div className="text-xs text-slate-400">
              Səhifə {data.page} / {totalPages} · {data.total} nəticə
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page <= 1}
                className="flex items-center gap-1 rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
              >
                <ChevronLeft className="h-3.5 w-3.5" /> Əvvəl
              </button>
              <button
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page >= totalPages}
                className="flex items-center gap-1 rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
              >
                Sonrakı <ChevronRight className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}