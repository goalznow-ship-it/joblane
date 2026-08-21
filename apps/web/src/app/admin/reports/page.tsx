"use client"

import { useCallback, useEffect, useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { adminReportApi, type ReportListItem, type ReportListResponse } from "@/lib/api"
import { REPORT_REASON_LABELS, REPORT_STATUS_LABELS, REPORT_PRIORITY_LABELS } from "@/lib/api"
import { Search, Loader2, ChevronLeft, ChevronRight, ShieldAlert } from "lucide-react"
import { cn } from "@/lib/utils"

const STATUS_COLORS: Record<string, string> = {
  OPEN: "bg-blue-100 text-blue-700",
  UNDER_REVIEW: "bg-amber-100 text-amber-700",
  ACTION_REQUIRED: "bg-orange-100 text-orange-700",
  RESOLVED: "bg-emerald-100 text-emerald-700",
  DISMISSED: "bg-slate-100 text-slate-600",
  DUPLICATE: "bg-purple-100 text-purple-700",
}

const PRIORITY_COLORS: Record<string, string> = {
  LOW: "bg-slate-100 text-slate-600",
  NORMAL: "bg-blue-100 text-blue-700",
  HIGH: "bg-orange-100 text-orange-700",
  CRITICAL: "bg-red-100 text-red-700",
}

const PAGE_SIZE = 20

function getTargetTitle(snapshot: Record<string, unknown> | null | undefined): string {
  if (!snapshot) return "—"
  return (snapshot.title as string) || (snapshot.name as string) || "—"
}

function fmtDate(iso: string): string {
  return new Date(iso).toLocaleString("az-AZ", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  })
}

export default function AdminReportsPage() {
  const router = useRouter()

  const [status, setStatus] = useState("")
  const [priority, setPriority] = useState("")
  const [targetType, setTargetType] = useState("")
  const [reason, setReason] = useState("")
  const [q, setQ] = useState("")
  const [page, setPage] = useState(1)
  const [data, setData] = useState<ReportListResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")

  const [kpiOpen, setKpiOpen] = useState<number | null>(null)
  const [kpiReview, setKpiReview] = useState<number | null>(null)
  const [kpiHigh, setKpiHigh] = useState<number | null>(null)
  const [kpiResolvedToday, setKpiResolvedToday] = useState<number | null>(null)

  const fetchList = useCallback(() => {
    setLoading(true)
    setError("")
    adminReportApi
      .list({
        status: status || undefined,
        priority: priority || undefined,
        target_type: targetType || undefined,
        reason: reason || undefined,
        q: q || undefined,
        page,
        limit: PAGE_SIZE,
      })
      .then((res) => {
        setData(res)
      })
      .catch((err) => setError(String(err)))
      .finally(() => setLoading(false))
  }, [status, priority, targetType, reason, q, page])

  useEffect(() => {
    fetchList()
  }, [fetchList])

  useEffect(() => {
    const fetchKpis = async () => {
      try {
        const [open, review, high, resolved] = await Promise.all([
          adminReportApi.list({ status: "OPEN", limit: 1 }),
          adminReportApi.list({ status: "UNDER_REVIEW", limit: 1 }),
          adminReportApi.list({ priority: "HIGH", limit: 1 }),
          adminReportApi.list({ status: "RESOLVED", limit: 1 }),
        ])
        setKpiOpen(open.total)
        setKpiReview(review.total)
        setKpiHigh(high.total)
        setKpiResolvedToday(resolved.total)
      } catch {
        // ignore KPI errors
      }
    }
    fetchKpis()
  }, [])

  const totalPages = data?.total_pages || 1

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Şikayətlər</h1>
          <p className="mt-1 text-sm text-slate-500">
            {data ? `Cəmi ${data.total} şikayət` : "Yüklənir..."}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="text-sm font-medium text-slate-500">Açıq</div>
          <div className="mt-1 text-2xl font-bold text-blue-600">{kpiOpen ?? "—"}</div>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="text-sm font-medium text-slate-500">Baxılır</div>
          <div className="mt-1 text-2xl font-bold text-amber-600">{kpiReview ?? "—"}</div>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="text-sm font-medium text-slate-500">Yüksək prioritet</div>
          <div className="mt-1 text-2xl font-bold text-orange-600">{kpiHigh ?? "—"}</div>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="text-sm font-medium text-slate-500">Həll edilib</div>
          <div className="mt-1 text-2xl font-bold text-emerald-600">{kpiResolvedToday ?? "—"}</div>
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
            placeholder="Şikayət üzrə axtar..."
            className="w-full rounded-lg border border-slate-300 bg-white py-2 pl-10 pr-3 text-sm outline-none transition focus:border-[#2563EB] focus:ring-2 focus:ring-blue-100"
          />
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <select
            value={status}
            onChange={(e) => { setStatus(e.target.value); setPage(1) }}
            className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm outline-none focus:border-[#2563EB]"
          >
            <option value="">Hamısı</option>
            {Object.entries(REPORT_STATUS_LABELS).map(([v, l]) => (
              <option key={v} value={v}>{l}</option>
            ))}
          </select>
          <select
            value={priority}
            onChange={(e) => { setPriority(e.target.value); setPage(1) }}
            className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm outline-none focus:border-[#2563EB]"
          >
            <option value="">Prioritet</option>
            {Object.entries(REPORT_PRIORITY_LABELS).map(([v, l]) => (
              <option key={v} value={v}>{l}</option>
            ))}
          </select>
          <select
            value={targetType}
            onChange={(e) => { setTargetType(e.target.value); setPage(1) }}
            className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm outline-none focus:border-[#2563EB]"
          >
            <option value="">Növ</option>
            <option value="JOB">Vakansiya</option>
            <option value="COMPANY">Şirkət</option>
            <option value="USER">İstifadəçi</option>
          </select>
          <select
            value={reason}
            onChange={(e) => { setReason(e.target.value); setPage(1) }}
            className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm outline-none focus:border-[#2563EB]"
          >
            <option value="">Səbəb</option>
            {Object.entries(REPORT_REASON_LABELS).map(([v, l]) => (
              <option key={v} value={v}>{l}</option>
            ))}
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
          <div className="px-6 py-16 text-center text-sm text-slate-400">Şikayət tapılmadı</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-slate-100 text-xs uppercase tracking-wider text-slate-400">
                  <th className="px-6 py-3.5 font-semibold">ID</th>
                  <th className="px-4 py-3.5 font-semibold">Obiect</th>
                  <th className="px-4 py-3.5 font-semibold">Səbəb</th>
                  <th className="px-4 py-3.5 font-semibold">Prioritet</th>
                  <th className="px-4 py-3.5 font-semibold">Status</th>
                  <th className="px-4 py-3.5 font-semibold">Yaradıldı</th>
                  <th className="px-6 py-3.5 text-right font-semibold">Əməliyyat</th>
                </tr>
              </thead>
              <tbody>
                {data.items.map((report) => (
                  <tr key={report.id} className="border-b border-slate-50 last:border-0 hover:bg-slate-50/60">
                    <td className="px-6 py-4 font-mono text-xs text-slate-500">
                      {report.id.slice(0, 8)}...
                    </td>
                    <td className="max-w-[220px] px-4 py-4">
                      <div className="truncate font-semibold text-slate-900">
                        {getTargetTitle(report.target_snapshot)}
                      </div>
                      <div className="mt-0.5 text-xs text-slate-400">
                        {report.target_type} · {report.target_id.slice(0, 8)}...
                      </div>
                    </td>
                    <td className="px-4 py-4 text-slate-600">
                      {REPORT_REASON_LABELS[report.reason] || report.reason}
                    </td>
                    <td className="px-4 py-4">
                      {report.priority && (
                        <span className={cn("rounded-full px-2.5 py-1 text-[11px] font-semibold whitespace-nowrap", PRIORITY_COLORS[report.priority] || "bg-slate-100 text-slate-600")}>
                          {REPORT_PRIORITY_LABELS[report.priority] || report.priority}
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-4">
                      <span className={cn("rounded-full px-2.5 py-1 text-[11px] font-semibold whitespace-nowrap", STATUS_COLORS[report.status] || "bg-slate-100 text-slate-600")}>
                        {REPORT_STATUS_LABELS[report.status] || report.status}
                      </span>
                    </td>
                    <td className="px-4 py-4 text-xs text-slate-500">
                      {fmtDate(report.created_at)}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <Link href={`/admin/reports/${report.id}`} className="text-xs font-semibold text-[#2563EB] hover:underline">
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
