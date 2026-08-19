"use client"

import { useCallback, useEffect, useState } from "react"
import Link from "next/link"
import { useSearchParams, useRouter } from "next/navigation"
import { adminApi, type AdminInternship, type InternshipListResponse } from "@/lib/admin-api"
import { Search, Loader2, ChevronLeft, ChevronRight, Plus, Edit, Trash2, Check, X, Archive, Eye, Star, Clock, Building2, MapPin, Calendar } from "lucide-react"
import { cn } from "@/lib/utils"

const PAGE_SIZE = 15

const STATUS_LABELS: Record<string, string> = {
  ALL: "Ham\u0131s\u0131",
  DRAFT: "Qaralama",
  PENDING_REVIEW: "G\u00f6zl\u0259m\u0259d\u0259",
  APPROVED: "T\u0259sdiql\u0259nib",
  REJECTED: "R\u0259dd edilib",
  PUBLISHED: "Yay\u0131mlan\u0131b",
  PAUSED: "Dayand\u0131r\u0131lib",
  EXPIRED: "Vaxt\u0131 bitib",
  ARCHIVED: "Arxivl\u0259\u015fib",
}

const STATUS_COLORS: Record<string, string> = {
  DRAFT: "bg-slate-100 text-slate-600",
  PENDING_REVIEW: "bg-amber-100 text-amber-700",
  APPROVED: "bg-emerald-100 text-emerald-700",
  REJECTED: "bg-red-100 text-red-700",
  PUBLISHED: "bg-blue-100 text-blue-700",
  PAUSED: "bg-slate-100 text-slate-600",
  EXPIRED: "bg-slate-100 text-slate-500",
  ARCHIVED: "bg-slate-100 text-slate-500",
}

const WORK_MODE_LABELS: Record<string, string> = {
  ON_SITE: "Ofis",
  REMOTE: "Uzaqdan",
  HYBRID: "Hibrid",
}


export default function AdminInternshipsPage() {
  const searchParams = useSearchParams()
  const router = useRouter()

  const [q, setQ] = useState(searchParams.get("q") || "")
  const [status, setStatus] = useState(searchParams.get("status") || "ALL")
  const [companyId, setCompanyId] = useState(searchParams.get("company_id") || "")
  const [isFeatured, setIsFeatured] = useState(searchParams.get("is_featured") || "ALL")
  const [page, setPage] = useState(1)
  const [sort, setSort] = useState("created_desc")
  const [data, setData] = useState<any | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")

  const fetchList = useCallback(() => {
    setLoading(true)
    setError("")
    adminApi
      .listInternships({
        q: q || undefined,
        status: status === "ALL" ? undefined : status,
        company_id: companyId || undefined,
        is_featured: isFeatured === "ALL" ? undefined : isFeatured === "true",
        page,
        limit: PAGE_SIZE,
        sort,
      })
      .then(setData)
      .catch((err) => setError(String(err)))
      .finally(() => setLoading(false))
  }, [q, status, companyId, isFeatured, page, sort])

  useEffect(() => {
    fetchList()
  }, [fetchList])

  useEffect(() => {
    const params = new URLSearchParams()
    if (q) params.set("q", q)
    if (status !== "ALL") params.set("status", status)
    if (companyId) params.set("company_id", companyId)
    if (isFeatured !== "ALL") params.set("is_featured", isFeatured)
    const qs = params.toString()
    router.replace(qs ? `/admin/internships?${qs}` : "/admin/internships", { scroll: false })
  }, [q, status, companyId, isFeatured, router])

  const totalPages = data?.total_pages || 1

  function fmtDate(iso: string | null): string {
    if (!iso) return "\u2014"
    return new Date(iso).toLocaleString("az-AZ", {
      day: "2-digit",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    })
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">T\u0259cr\u0259b\u0259 proqramlar\u0131</h1>
          <p className="mt-1 text-sm text-slate-500">
            {data ? `C\u0259mi ${data.total} t\u0259cr\u0259b\u0259 proqram\u0131` : "Y\u00fckl\u0259nir..."}
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
            placeholder="Ad, \u015firk\u0259t, \u0259lav\u0259 axtar..."
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
            <option value="ALL">Ham\u0131s\u0131</option>
            <option value="DRAFT">Qaralama</option>
            <option value="PENDING_REVIEW">G\u00f6zl\u0259m\u0259d\u0259</option>
            <option value="APPROVED">T\u0259sdiql\u0259nib</option>
            <option value="REJECTED">R\u0259dd edilib</option>
            <option value="PUBLISHED">Yay\u0131mlan\u0131b</option>
            <option value="PAUSED">Dayand\u0131r\u0131lib</option>
            <option value="EXPIRED">Vaxt\u0131 bitib</option>
            <option value="ARCHIVED">Arxivl\u0259\u015fib</option>
          </select>
          <select
            value={isFeatured}
            onChange={(e) => {
              setIsFeatured(e.target.value)
              setPage(1)
            }}
            className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm outline-none focus:border-[#2563EB]"
          >
            <option value="ALL">Ham\u0131s\u0131</option>
            <option value="true">\u00d6z\u0259l</option>
            <option value="false">Adi</option>
          </select>
          <select
            value={sort}
            onChange={(e) => {
              setSort(e.target.value)
              setPage(1)
            }}
            className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm outline-none focus:border-[#2563EB]"
          >
            <option value="created_desc">\u0258n yeni</option>
            <option value="created_asc">\u0258n k\u00f6hn\u0259</option>
            <option value="title_asc">Ad (A-Z)</option>
          </select>
        </div>
      </div>

      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        {loading ? (
          <div className="flex items-center justify-center gap-2 py-16 text-sm text-slate-400">
            <Loader2 className="h-5 w-5 animate-spin text-[#2563EB]" />
            Y\u00fckl\u0259nir...
          </div>
        ) : error ? (
          <div className="px-6 py-10 text-sm text-red-600">X\u0259ta: {error}</div>
        ) : !data || data.items.length === 0 ? (
          <div className="px-6 py-16 text-center text-sm text-slate-400">N\u0259tic\u0259 tap\u0131lmad\u0131</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-slate-100 text-xs uppercase tracking-wider text-slate-400">
                  <th className="px-6 py-3.5 font-semibold">T\u0259cr\u0259b\u0259 proqram\u0131</th>
                  <th className="px-4 py-3.5 font-semibold">\u015eirk\u0259t</th>
                  <th className="px-4 py-3.5 font-semibold">\u0130\u015f rejimi</th>
                  <th className="px-4 py-3.5 font-semibold">Status</th>
                  <th className="px-4 py-3.5 font-semibold">\u00d6z\u0259l</th>
                  <th className="px-4 py-3.5 font-semibold">Ba\u015flama</th>
                  <th className="px-4 py-3.5 font-semibold">Bitm\u0259</th>
                  <th className="px-4 py-3.5 font-semibold">Yarad\u0131lma</th>
                  <th className="px-6 py-3.5 text-right font-semibold">\u0258m\u0259liyyat</th>
                </tr>
              </thead>
              <tbody>
                {data.items.map((item: any) => (
                  <tr key={item.id} className="border-b border-slate-50 last:border-0 hover:bg-slate-50/60">
                    <td className="max-w-[280px] px-6 py-4">
                      <div className="truncate font-semibold text-slate-900">{item.title}</div>
                      <div className="mt-0.5 text-xs text-slate-400">{item.company_name || "\u2014"}</div>
                    </td>
                    <td className="px-4 py-4 text-slate-600">{item.company_name || "\u2014"}</td>
                    <td className="px-4 py-4 text-slate-600">{item.work_mode ? WORK_MODE_LABELS[item.work_mode] || item.work_mode : "\u2014"}</td>
                    <td className="px-4 py-4">
                      <span className={cn("rounded-full px-2.5 py-1 text-[11px] font-semibold whitespace-nowrap", STATUS_COLORS[item.status] || "bg-slate-100 text-slate-600")}>
                        {STATUS_LABELS[item.status] || item.status}
                      </span>
                    </td>
                    <td className="px-4 py-4">
                      <span className={cn("rounded-full px-2.5 py-1 text-[11px] font-semibold whitespace-nowrap", item.is_featured ? "bg-amber-100 text-amber-700" : "bg-slate-100 text-slate-600")}>
                        {item.is_featured ? "\u00d6z\u0259l" : "Adi"}
                      </span>
                      {item.featured_until && (
                        <div className="mt-0.5 text-xs text-slate-400">bitm\u0259: {new Date(item.featured_until).toLocaleDateString("az-AZ")}</div>
                      )}
                    </td>
                    <td className="px-4 py-4 text-slate-500">{fmtDate(item.start_date)}</td>
                    <td className="px-4 py-4 text-slate-500">{fmtDate(item.end_date)}</td>
                    <td className="px-4 py-4 text-slate-500">{fmtDate(item.created_at)}</td>
                    <td className="px-6 py-4 text-right">
                      <Link href={`/admin/internships/${item.id}`} className="text-xs font-semibold text-[#2563EB] hover:underline">
                        \u0130dar\u0259 et \u2192
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
              S\u0259hif\u0259 {data.page} / {data.total_pages} \u00b7 {data.total} n\u0259tic\u0259
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page <= 1}
                className="flex items-center gap-1 rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
              >
                <ChevronLeft className="h-3.5 w-3.5" /> \u0258vv\u0259l
              </button>
              <button
                onClick={() => setPage((p) => Math.min(data.total_pages, p + 1))}
                disabled={page >= data.total_pages}
                className="flex items-center gap-1 rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
              >
                Sonrak\u0131 <ChevronRight className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

function fmtDate(iso: string | null): string {
  if (!iso) return "\u2014"
  return new Date(iso).toLocaleString("az-AZ", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  })
}

