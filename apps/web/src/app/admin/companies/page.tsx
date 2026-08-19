"use client"

import { useCallback, useEffect, useState } from "react"
import Link from "next/link"
import { useSearchParams, useRouter } from "next/navigation"
import { adminApi, type AdminCompany, type CompanyListResponse } from "@/lib/admin-api"
import { Search, Loader2, ChevronLeft, ChevronRight, ShieldCheck, BadgeCheck, BadgeX, Archive, RotateCcw, Eye, Building2, Star, MapPin, Calendar, MoreVertical } from "lucide-react"
import { cn } from "@/lib/utils"

const STATUS_LABELS: Record<string, string> = {
  ALL: "Hamısı",
  PENDING: "Gözləmədə",
  VERIFIED: "Təsdiqlənib",
  ACTIVE: "Aktiv",
  SUSPENDED: "Dayandırılıb",
  REJECTED: "Rədd edilib",
  ARCHIVED: "Arxivləşib",
}

const STATUS_COLORS: Record<string, string> = {
  PENDING: "bg-amber-100 text-amber-700",
  VERIFIED: "bg-emerald-100 text-emerald-700",
  ACTIVE: "bg-blue-100 text-blue-700",
  SUSPENDED: "bg-orange-100 text-orange-700",
  REJECTED: "bg-red-100 text-red-700",
  ARCHIVED: "bg-slate-100 text-slate-500",
}

const VERIFIED_LABELS: Record<string, string> = {
  ALL: "Hamısı",
  VERIFIED: "Təsdiqlənmiş",
  UNVERIFIED: "Təsdiqlənmemiş",
}

const FEATURED_LABELS: Record<string, string> = {
  ALL: "Hamısı",
  FEATURED: "Özəl",
  NORMAL: "Adi",
}

const PAGE_SIZE = 15

export default function AdminCompaniesPage() {
  const searchParams = useSearchParams()
  const router = useRouter()

  const [q, setQ] = useState(searchParams.get("q") || "")
  const [status, setStatus] = useState(searchParams.get("status") || "ALL")
  const [verified, setVerified] = useState(searchParams.get("verified") || "ALL")
  const [featured, setFeatured] = useState(searchParams.get("featured") || "ALL")
  const [page, setPage] = useState(1)
  const [sort, setSort] = useState("created_desc")
  const [data, setData] = useState<CompanyListResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")

  const fetchList = useCallback(() => {
    setLoading(true)
    setError("")
    adminApi
      .listCompanies({
        q: q || undefined,
        status: status === "ALL" ? undefined : status,
        verified_only: verified === "VERIFIED" ? true : verified === "UNVERIFIED" ? false : undefined,
        featured_only: featured === "FEATURED" ? true : featured === "NORMAL" ? false : undefined,
        page,
        limit: PAGE_SIZE,
        sort,
      })
      .then(setData)
      .catch((err) => setError(String(err)))
      .finally(() => setLoading(false))
  }, [q, status, verified, featured, page, sort])

  useEffect(() => {
    fetchList()
  }, [fetchList])

  useEffect(() => {
    const params = new URLSearchParams()
    if (q) params.set("q", q)
    if (status !== "ALL") params.set("status", status)
    if (verified !== "ALL") params.set("verified", verified)
    if (featured !== "ALL") params.set("featured", featured)
    const qs = params.toString()
    router.replace(qs ? `/admin/companies?${qs}` : "/admin/companies", { scroll: false })
  }, [q, status, verified, featured, router])

  const totalPages = data?.total_pages || 1

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Şirkətlər</h1>
          <p className="mt-1 text-sm text-slate-500">
            {data ? `Cəmi ${data.total} şirkət` : "Yüklənir..."}
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
            placeholder="Şirkət adı, slug, email üzrə axtar..."
            className="w-full rounded-lg border border-slate-300 bg-white py-2 pl-10 pr-3 text-sm outline-none transition focus:border-[#2563EB] focus:ring-2 focus:ring-blue-100"
          />
        </div>
        <div className="flex items-center gap-2 flex-wrap">
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
            value={verified}
            onChange={(e) => {
              setVerified(e.target.value)
              setPage(1)
            }}
            className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm outline-none focus:border-[#2563EB]"
          >
            {Object.entries(VERIFIED_LABELS).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
          <select
            value={featured}
            onChange={(e) => {
              setFeatured(e.target.value)
              setPage(1)
            }}
            className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm outline-none focus:border-[#2563EB]"
          >
            {Object.entries(FEATURED_LABELS).map(([value, label]) => (
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
            <option value="name_asc">Ad (A-Z)</option>
            <option value="name_desc">Ad (Z-A)</option>
            <option value="verified_desc">Təsdiqlənmə tarixi (yeni)</option>
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
                  <th className="px-6 py-3.5 font-semibold">Şirkət</th>
                  <th className="px-4 py-3.5 font-semibold">Sənaye</th>
                  <th className="px-4 py-3.5 font-semibold">Vakansiyalar</th>
                  <th className="px-4 py-3.5 font-semibold">Status</th>
                  <th className="px-4 py-3.5 font-semibold">Təsdiq</th>
                  <th className="px-4 py-3.5 font-semibold">Özəl</th>
                  <th className="px-4 py-3.5 font-semibold">Yaradılma</th>
                  <th className="px-6 py-3.5 text-right font-semibold">Əməliyyat</th>
                </tr>
              </thead>
              <tbody>
                {data.items.map((company: AdminCompany) => (
                  <tr key={company.id} className="border-b border-slate-50 last:border-0 hover:bg-slate-50/60">
                    <td className="max-w-[280px] px-6 py-4">
                      <div className="flex items-center gap-2">
                        {company.logo_url ? (
                          <img src={company.logo_url} alt="" className="h-8 w-8 rounded-lg object-cover border border-slate-200" />
                        ) : (
                          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-slate-100 text-slate-400">
                            <Building2 className="h-4 w-4" />
                          </div>
                        )}
                        <div className="truncate font-semibold text-slate-900">{company.name}</div>
                      </div>
                      <div className="mt-0.5 text-xs text-slate-400">{company.slug}</div>
                    </td>
                    <td className="max-w-[180px] truncate px-4 py-4 text-slate-600">{company.industry_name || company.industry || "—"}</td>
                    <td className="px-4 py-4 text-slate-600">
                      {company.active_jobs_count !== null || company.total_jobs_count !== null ? (
                        <>
                          <span className="font-semibold text-slate-900">{company.active_jobs_count || 0}</span>
                          <span className="text-slate-400"> / </span>
                          <span className="text-slate-500">{company.total_jobs_count || 0}</span>
                        </>
                      ) : (
                        "—"
                      )}
                    </td>
                    <td className="px-4 py-4">
                      <span className={cn("rounded-full px-2.5 py-1 text-[11px] font-semibold whitespace-nowrap", STATUS_COLORS[company.status] || "bg-slate-100 text-slate-600")}>
                        {STATUS_LABELS[company.status] || company.status}
                      </span>
                    </td>
                    <td className="px-4 py-4">
                      <span className={cn("rounded-full px-2.5 py-1 text-[11px] font-semibold whitespace-nowrap", company.verified_at ? "bg-emerald-100 text-emerald-700" : "bg-slate-100 text-slate-600")}>
                        {company.verified_at ? "Təsdiqlənib" : "Təsdiqlənməmiş"}
                      </span>
                      {company.verified_at && (
                        <div className="mt-0.5 text-xs text-slate-400">{new Date(company.verified_at).toLocaleDateString("az-AZ")}</div>
                      )}
                    </td>
                    <td className="px-4 py-4">
                      <span className={cn("rounded-full px-2.5 py-1 text-[11px] font-semibold whitespace-nowrap", company.featured_until ? "bg-amber-100 text-amber-700" : "bg-slate-100 text-slate-600")}>
                        {company.featured_until ? "Özəl" : "Adi"}
                      </span>
                      {company.featured_until && (
                        <div className="mt-0.5 text-xs text-slate-400">bitmə: {new Date(company.featured_until).toLocaleDateString("az-AZ")}</div>
                      )}
                    </td>
                    <td className="px-4 py-4 text-slate-500">{company.created_at ? new Date(company.created_at).toLocaleDateString("az-AZ") : "—"}</td>
                    <td className="px-6 py-4 text-right">
                      <Link href={`/admin/companies/${company.id}`} className="text-xs font-semibold text-[#2563EB] hover:underline">
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