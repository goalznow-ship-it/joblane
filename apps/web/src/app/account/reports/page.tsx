"use client"

import { useCallback, useEffect, useState } from "react"
import { reportApi, type ReportListItem, type ReportListResponse, REPORT_REASON_LABELS, REPORT_STATUS_LABELS, REPORT_RESOLUTION_LABELS } from "@/lib/api"
import { Loader2, ChevronLeft, ChevronRight } from "lucide-react"
import { cn } from "@/lib/utils"
import { Header } from "@/components/Header"
import { Footer } from "@/components/Footer"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

const STATUS_COLORS: Record<string, string> = {
  OPEN: "bg-blue-100 text-blue-700",
  UNDER_REVIEW: "bg-amber-100 text-amber-700",
  ACTION_REQUIRED: "bg-orange-100 text-orange-700",
  RESOLVED: "bg-emerald-100 text-emerald-700",
  DISMISSED: "bg-slate-100 text-slate-600",
  DUPLICATE: "bg-purple-100 text-purple-700",
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

export default function AccountReportsPage() {
  const [data, setData] = useState<ReportListResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")
  const [page, setPage] = useState(1)

  const fetchList = useCallback(() => {
    setLoading(true)
    setError("")
    reportApi
      .listMy({ page, limit: PAGE_SIZE })
      .then(setData)
      .catch((err) => setError(String(err)))
      .finally(() => setLoading(false))
  }, [page])

  useEffect(() => {
    fetchList()
  }, [fetchList])

  const totalPages = data?.total_pages || 1

  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <main className="flex-1 py-8">
        <div className="mx-auto max-w-4xl px-4">
          <div className="mb-6">
            <h1 className="text-2xl font-bold text-slate-900">Şikayətlərim</h1>
            <p className="mt-1 text-sm text-slate-500">
              Göndərdiyiniz şikayətlərin statusu
            </p>
          </div>

          <Card>
            <CardContent className="p-0">
              {loading ? (
                <div className="flex items-center justify-center gap-2 py-16 text-sm text-slate-400">
                  <Loader2 className="h-5 w-5 animate-spin text-[#2563EB]" />
                  Yüklənir...
                </div>
              ) : error ? (
                <div className="px-6 py-10 text-sm text-red-600">Xəta: {error}</div>
              ) : !data || data.items.length === 0 ? (
                <div className="px-6 py-16 text-center text-sm text-slate-400">Hələ şikayət göndərməmisiniz</div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-sm">
                    <thead>
                      <tr className="border-b border-slate-100 text-xs uppercase tracking-wider text-slate-400">
                        <th className="px-6 py-3.5 font-semibold">Obiect</th>
                        <th className="px-4 py-3.5 font-semibold">Səbəb</th>
                        <th className="px-4 py-3.5 font-semibold">Status</th>
                        <th className="px-4 py-3.5 font-semibold">Yaradıldı</th>
                      </tr>
                    </thead>
                    <tbody>
                      {data.items.map((report) => (
                        <tr key={report.id} className="border-b border-slate-50 last:border-0 hover:bg-slate-50/60">
                          <td className="max-w-[250px] px-6 py-4">
                            <div className="truncate font-semibold text-slate-900">
                              {getTargetTitle(report.target_snapshot)}
                            </div>
                            <div className="mt-0.5 text-xs text-slate-400">{report.target_type}</div>
                          </td>
                          <td className="px-4 py-4 text-slate-600">
                            {REPORT_REASON_LABELS[report.reason] || report.reason}
                          </td>
                          <td className="px-4 py-4">
                            <span className={cn("rounded-full px-2.5 py-1 text-[11px] font-semibold whitespace-nowrap", STATUS_COLORS[report.status] || "bg-slate-100 text-slate-600")}>
                              {REPORT_STATUS_LABELS[report.status] || report.status}
                            </span>
                          </td>
                          <td className="px-4 py-4 text-xs text-slate-500">
                            {fmtDate(report.created_at)}
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
            </CardContent>
          </Card>
        </div>
      </main>
      <Footer />
    </div>
  )
}
