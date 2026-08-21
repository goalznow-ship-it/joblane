"use client"

import { useCallback, useEffect, useState } from "react"
import Link from "next/link"
import { useParams } from "next/navigation"
import { adminReportApi, type Report, type ReportHistoryEntry } from "@/lib/api"
import {
  REPORT_REASON_LABELS,
  REPORT_STATUS_LABELS,
  REPORT_PRIORITY_LABELS,
  REPORT_RESOLUTION_LABELS,
} from "@/lib/api"
import {
  ArrowLeft,
  Loader2,
  User,
  Clock,
  ShieldAlert,
  ExternalLink,
  Copy,
  CheckCircle,
  XCircle,
  AlertTriangle,
  Ban,
  Trash2,
  Pause,
  Archive,
} from "lucide-react"
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

function fmtDate(iso: string | null): string {
  if (!iso) return "—"
  return new Date(iso).toLocaleString("az-AZ", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  })
}

function getTargetTitle(snapshot: Record<string, unknown> | null | undefined): string {
  if (!snapshot) return "—"
  return (snapshot.title as string) || (snapshot.name as string) || "—"
}

function getTargetLink(report: Report): string | null {
  if (report.target_type === "JOB") {
    const snapshot = report.target_snapshot as Record<string, unknown> | null
    const slug = snapshot?.slug as string
    return slug ? `/jobs/${slug}` : null
  }
  if (report.target_type === "COMPANY") {
    const snapshot = report.target_snapshot as Record<string, unknown> | null
    const slug = snapshot?.slug as string
    return slug ? `/companies/${slug}` : null
  }
  return null
}

export default function AdminReportDetailPage() {
  const params = useParams<{ id: string }>()
  const id = params.id

  const [report, setReport] = useState<Report & { history?: ReportHistoryEntry[]; related_reports_count?: number } | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")
  const [busy, setBusy] = useState(false)

  const [dismissNote, setDismissNote] = useState("")
  const [showDismiss, setShowDismiss] = useState(false)

  const [resolveResolution, setResolveResolution] = useState("")
  const [resolveNote, setResolveNote] = useState("")
  const [resolveReporterMsg, setResolveReporterMsg] = useState("")
  const [showResolve, setShowResolve] = useState(false)

  const [duplicateId, setDuplicateId] = useState("")
  const [showDuplicate, setShowDuplicate] = useState(false)

  const [jobAction, setJobAction] = useState("")
  const [actionReason, setActionReason] = useState("")
  const [actionNote, setActionNote] = useState("")
  const [showJobAction, setShowJobAction] = useState(false)

  const [companyAction, setCompanyAction] = useState("")
  const [showCompanyAction, setShowCompanyAction] = useState(false)

  const fetchReport = useCallback(() => {
    setLoading(true)
    setError("")
    adminReportApi
      .get(id)
      .then(setReport)
      .catch((err) => setError(String(err)))
      .finally(() => setLoading(false))
  }, [id])

  useEffect(() => {
    fetchReport()
  }, [fetchReport])

  const run = async (fn: () => Promise<Report>) => {
    setBusy(true)
    try {
      const updated = await fn()
      setReport((prev) => prev ? { ...prev, ...updated } : updated)
      setShowDismiss(false)
      setShowResolve(false)
      setShowDuplicate(false)
      setShowJobAction(false)
      setShowCompanyAction(false)
      setDismissNote("")
      setResolveResolution("")
      setResolveNote("")
      setResolveReporterMsg("")
      setDuplicateId("")
      setActionReason("")
      setActionNote("")
      fetchReport()
    } catch (err) {
      const detail = (err as any)?.detail
      alert(typeof detail === "string" ? detail : "Əməliyyat uğursuz oldu")
    } finally {
      setBusy(false)
    }
  }

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center text-sm text-slate-400">
        <Loader2 className="mr-2 h-5 w-5 animate-spin text-[#2563EB]" /> Yüklənir...
      </div>
    )
  }

  if (error || !report) {
    return <div className="rounded-xl border border-red-200 bg-red-50 p-6 text-sm text-red-700">Xəta: {error}</div>
  }

  const isOpen = report.status === "OPEN" || report.status === "UNDER_REVIEW" || report.status === "ACTION_REQUIRED"
  const targetLink = getTargetLink(report)

  return (
    <div className="space-y-6">
      <Link href="/admin/reports" className="inline-flex items-center gap-1.5 text-sm font-medium text-slate-500 hover:text-slate-800">
        <ArrowLeft className="h-4 w-4" /> Şikayətlər
      </Link>

      <div className="flex flex-col gap-4 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm md:flex-row md:items-start md:justify-between">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="text-2xl font-bold text-slate-900">Şikayət</h1>
            <span className="font-mono text-sm text-slate-400">{report.id.slice(0, 12)}...</span>
          </div>
          <div className="mt-3 flex flex-wrap items-center gap-x-5 gap-y-2 text-sm text-slate-500">
            <span className="inline-flex items-center gap-1.5">
              <Clock className="h-4 w-4 text-slate-400" /> {fmtDate(report.created_at)}
            </span>
            <span className="inline-flex items-center gap-1.5">
              <ShieldAlert className="h-4 w-4 text-slate-400" /> {report.target_type}
            </span>
          </div>
          <div className="mt-4 flex flex-wrap items-center gap-2">
            <span className={cn("rounded-full px-3 py-1 text-xs font-semibold", STATUS_COLORS[report.status] || "bg-slate-100 text-slate-600")}>
              {REPORT_STATUS_LABELS[report.status] || report.status}
            </span>
            {report.priority && (
              <span className={cn("rounded-full px-3 py-1 text-xs font-semibold", PRIORITY_COLORS[report.priority] || "bg-slate-100 text-slate-600")}>
                Prioritet: {REPORT_PRIORITY_LABELS[report.priority] || report.priority}
              </span>
            )}
          </div>
        </div>

        {isOpen && (
          <div className="flex shrink-0 flex-col gap-2 md:w-64">
            <button
              onClick={() => run(() => adminReportApi.assign(report.id))}
              disabled={busy}
              className="flex items-center justify-center gap-1.5 rounded-lg bg-[#2563EB] px-3 py-2.5 text-sm font-semibold text-white transition hover:bg-[#1D4ED8] disabled:opacity-50"
            >
              <User className="h-4 w-4" /> Özümə təyin et
            </button>
            <div className="flex gap-2">
              <button
                onClick={() => setShowResolve(true)}
                disabled={busy}
                className="flex flex-1 items-center justify-center gap-1.5 rounded-lg bg-emerald-600 px-3 py-2.5 text-sm font-semibold text-white transition hover:bg-emerald-700 disabled:opacity-50"
              >
                <CheckCircle className="h-4 w-4" /> Həll et
              </button>
              <button
                onClick={() => setShowDismiss(true)}
                disabled={busy}
                className="flex flex-1 items-center justify-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm font-semibold text-slate-600 transition hover:bg-slate-50 disabled:opacity-50"
              >
                <XCircle className="h-4 w-4" /> Rədd et
              </button>
            </div>
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <h2 className="mb-4 text-sm font-bold text-slate-900">Hədəf məlumatları</h2>
            <div className="rounded-xl border border-slate-100 bg-slate-50/60 p-4">
              <div className="text-sm font-semibold text-slate-800">{getTargetTitle(report.target_snapshot)}</div>
              <div className="mt-1 text-xs text-slate-400">
                Tip: {report.target_type} · ID: {report.target_id}
              </div>
              {targetLink && (
                <Link href={targetLink} target="_blank" className="mt-2 inline-flex items-center gap-1 text-xs font-semibold text-[#2563EB] hover:underline">
                  İctimai səhifə <ExternalLink className="h-3 w-3" />
                </Link>
              )}
            </div>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <h2 className="mb-4 text-sm font-bold text-slate-900">Şikayətçi</h2>
            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-full bg-slate-100">
                <User className="h-4 w-4 text-slate-500" />
              </div>
              <div>
                <div className="text-sm font-semibold text-slate-800">İstifadəçi</div>
                <div className="text-xs text-slate-400">Şikayət tarixi: {fmtDate(report.created_at)}</div>
              </div>
            </div>
          </div>

          {report.description && (
            <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
              <h2 className="mb-4 text-sm font-bold text-slate-900">Şərh</h2>
              <p className="whitespace-pre-line text-sm leading-relaxed text-slate-600">{report.description}</p>
            </div>
          )}

          {report.resolution && (
            <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-6">
              <h2 className="mb-3 text-sm font-bold text-emerald-800">Həll</h2>
              <div className="text-sm font-semibold text-emerald-700">
                {REPORT_RESOLUTION_LABELS[report.resolution] || report.resolution}
              </div>
              {report.resolution_note && (
                <p className="mt-2 text-sm text-emerald-600">Qeyd: {report.resolution_note}</p>
              )}
              {report.reporter_message && (
                <p className="mt-2 text-sm text-emerald-600">Şikayətçiyə mesaj: {report.reporter_message}</p>
              )}
              {report.resolved_at && (
                <p className="mt-2 text-xs text-emerald-500">Həll edilib: {fmtDate(report.resolved_at)}</p>
              )}
            </div>
          )}
        </div>

        <div className="space-y-6">
          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <h2 className="mb-4 text-sm font-bold text-slate-900">Əlaqəli şikayətlər</h2>
            <div className="rounded-xl border border-slate-100 bg-slate-50/60 p-4 text-center">
              <div className="text-2xl font-bold text-slate-800">{report.related_reports_count ?? 0}</div>
              <div className="text-xs text-slate-400">Eyni obiect üzrə şikayət</div>
            </div>
          </div>

          {isOpen && (
            <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
              <h2 className="mb-4 text-sm font-bold text-slate-900">Prioritet</h2>
              <div className="flex gap-2">
                {(["LOW", "NORMAL", "HIGH", "CRITICAL"] as const).map((p) => (
                  <button
                    key={p}
                    onClick={() => run(() => adminReportApi.changePriority(report.id, p))}
                    disabled={busy || report.priority === p}
                    className={cn(
                      "flex-1 rounded-lg px-3 py-2 text-xs font-semibold transition disabled:opacity-50",
                      report.priority === p
                        ? "bg-[#2563EB] text-white"
                        : "border border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
                    )}
                  >
                    {REPORT_PRIORITY_LABELS[p]}
                  </button>
                ))}
              </div>
            </div>
          )}

          {isOpen && (
            <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm space-y-3">
              <h2 className="text-sm font-bold text-slate-900">Əməliyyatlar</h2>
              <button
                onClick={() => setShowDuplicate(true)}
                disabled={busy}
                className="flex w-full items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm font-semibold text-slate-600 transition hover:bg-slate-50 disabled:opacity-50"
              >
                <Copy className="h-4 w-4" /> Təkrar kimi işarələ
              </button>
              {report.target_type === "JOB" && (
                <button
                  onClick={() => setShowJobAction(true)}
                  disabled={busy}
                  className="flex w-full items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm font-semibold text-slate-600 transition hover:bg-slate-50 disabled:opacity-50"
                >
                  <AlertTriangle className="h-4 w-4" /> Vakansiya üzrə əməliyyat
                </button>
              )}
              {report.target_type === "COMPANY" && (
                <button
                  onClick={() => setShowCompanyAction(true)}
                  disabled={busy}
                  className="flex w-full items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm font-semibold text-slate-600 transition hover:bg-slate-50 disabled:opacity-50"
                >
                  <Ban className="h-4 w-4" /> Şirkət üzrə əməliyyat
                </button>
              )}
            </div>
          )}

          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <h2 className="mb-4 text-sm font-bold text-slate-900">Tarixçə</h2>
            {!report.history || report.history.length === 0 ? (
              <div className="py-4 text-center text-xs text-slate-400">Tarixçə yoxdur</div>
            ) : (
              <ol className="relative space-y-4 border-l border-slate-200 pl-4">
                {[...report.history].reverse().map((h) => (
                  <li key={h.id} className="relative">
                    <span className="absolute -left-[21px] top-1.5 h-2.5 w-2.5 rounded-full border-2 border-white bg-[#2563EB]" />
                    <div className="text-xs font-semibold text-slate-800">{h.action}</div>
                    <div className="mt-0.5 text-[11px] text-slate-400">
                      {h.from_status && h.to_status
                        ? `${REPORT_STATUS_LABELS[h.from_status] || h.from_status} → ${REPORT_STATUS_LABELS[h.to_status] || h.to_status}`
                        : h.to_status
                          ? REPORT_STATUS_LABELS[h.to_status] || h.to_status
                          : ""}
                      {" · "}
                      {fmtDate(h.created_at)}
                    </div>
                    {h.note && <div className="mt-1 text-[11px] text-slate-500">Qeyd: {h.note}</div>}
                  </li>
                ))}
              </ol>
            )}
          </div>
        </div>
      </div>

      {showDismiss && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-6" onClick={() => setShowDismiss(false)}>
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-lg font-bold text-slate-900">Şikayəti rədd et</h3>
            <p className="mt-1 text-sm text-slate-500">Bu şikayət əsassızdır vəəsasdır.</p>
            <div className="mt-5 space-y-4">
              <div>
                <label className="mb-1.5 block text-sm font-medium text-slate-700">Daxili qeyd (opsional)</label>
                <textarea
                  value={dismissNote}
                  onChange={(e) => setDismissNote(e.target.value)}
                  rows={3}
                  placeholder="Yalnız adminlər üçün"
                  className="w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm outline-none focus:border-[#2563EB] focus:ring-2 focus:ring-blue-100"
                />
              </div>
            </div>
            <div className="mt-6 flex gap-3">
              <button
                onClick={() => setShowDismiss(false)}
                className="flex-1 rounded-lg border border-slate-200 py-2.5 text-sm font-semibold text-slate-600 hover:bg-slate-50"
              >
                Ləğv et
              </button>
              <button
                onClick={() => run(() => adminReportApi.dismiss(report.id, dismissNote.trim() || undefined))}
                disabled={busy}
                className="flex-1 rounded-lg bg-red-600 py-2.5 text-sm font-semibold text-white hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {busy ? <Loader2 className="mx-auto h-4 w-4 animate-spin" /> : "Rədd et"}
              </button>
            </div>
          </div>
        </div>
      )}

      {showResolve && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-6" onClick={() => setShowResolve(false)}>
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-lg font-bold text-slate-900">Şikayəti həll et</h3>
            <p className="mt-1 text-sm text-slate-500">Həll kateqoriyasını seçin.</p>
            <div className="mt-5 space-y-4">
              <div>
                <label className="mb-1.5 block text-sm font-medium text-slate-700">
                  Həll kateqoriyası <span className="text-red-500">*</span>
                </label>
                <select
                  value={resolveResolution}
                  onChange={(e) => setResolveResolution(e.target.value)}
                  className="w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm outline-none focus:border-[#2563EB]"
                >
                  <option value="">Seçin</option>
                  {Object.entries(REPORT_RESOLUTION_LABELS).map(([v, l]) => (
                    <option key={v} value={v}>{l}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="mb-1.5 block text-sm font-medium text-slate-700">Daxili qeyd</label>
                <textarea
                  value={resolveNote}
                  onChange={(e) => setResolveNote(e.target.value)}
                  rows={2}
                  placeholder="Yalnız adminlər üçün"
                  className="w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm outline-none focus:border-[#2563EB] focus:ring-2 focus:ring-blue-100"
                />
              </div>
              <div>
                <label className="mb-1.5 block text-sm font-medium text-slate-700">Şikayətçiyə mesaj</label>
                <textarea
                  value={resolveReporterMsg}
                  onChange={(e) => setResolveReporterMsg(e.target.value)}
                  rows={2}
                  placeholder="Şikayətçiyə göstəriləcək mesaj"
                  className="w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm outline-none focus:border-[#2563EB] focus:ring-2 focus:ring-blue-100"
                />
              </div>
            </div>
            <div className="mt-6 flex gap-3">
              <button
                onClick={() => setShowResolve(false)}
                className="flex-1 rounded-lg border border-slate-200 py-2.5 text-sm font-semibold text-slate-600 hover:bg-slate-50"
              >
                Ləğv et
              </button>
              <button
                onClick={() => run(() => adminReportApi.resolve(report.id, resolveResolution, resolveNote.trim() || undefined, resolveReporterMsg.trim() || undefined))}
                disabled={busy || !resolveResolution}
                className="flex-1 rounded-lg bg-emerald-600 py-2.5 text-sm font-semibold text-white hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {busy ? <Loader2 className="mx-auto h-4 w-4 animate-spin" /> : "Həll et"}
              </button>
            </div>
          </div>
        </div>
      )}

      {showDuplicate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-6" onClick={() => setShowDuplicate(false)}>
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-lg font-bold text-slate-900">Təkrar şikayət kimi işarələ</h3>
            <p className="mt-1 text-sm text-slate-500">Əsas şikayət ID-sini daxil edin.</p>
            <div className="mt-5 space-y-4">
              <div>
                <label className="mb-1.5 block text-sm font-medium text-slate-700">
                  Əsas şikayət ID <span className="text-red-500">*</span>
                </label>
                <input
                  value={duplicateId}
                  onChange={(e) => setDuplicateId(e.target.value)}
                  placeholder="UUID formatında"
                  className="w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm outline-none focus:border-[#2563EB] focus:ring-2 focus:ring-blue-100"
                />
              </div>
            </div>
            <div className="mt-6 flex gap-3">
              <button
                onClick={() => setShowDuplicate(false)}
                className="flex-1 rounded-lg border border-slate-200 py-2.5 text-sm font-semibold text-slate-600 hover:bg-slate-50"
              >
                Ləğv et
              </button>
              <button
                onClick={() => run(() => adminReportApi.markDuplicate(report.id, duplicateId.trim()))}
                disabled={busy || !duplicateId.trim()}
                className="flex-1 rounded-lg bg-purple-600 py-2.5 text-sm font-semibold text-white hover:bg-purple-700 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {busy ? <Loader2 className="mx-auto h-4 w-4 animate-spin" /> : "İşarələ"}
              </button>
            </div>
          </div>
        </div>
      )}

      {showJobAction && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-6" onClick={() => setShowJobAction(false)}>
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-lg font-bold text-slate-900">Vakansiya üzrə əməliyyat</h3>
            <p className="mt-1 text-sm text-slate-500">Əməliyyat seçin.</p>
            <div className="mt-5 space-y-4">
              <div>
                <label className="mb-1.5 block text-sm font-medium text-slate-700">
                  Əməliyyat <span className="text-red-500">*</span>
                </label>
                <select
                  value={jobAction}
                  onChange={(e) => setJobAction(e.target.value)}
                  className="w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm outline-none focus:border-[#2563EB]"
                >
                  <option value="">Seçin</option>
                  <option value="pause">Dayandır</option>
                  <option value="archive">Arxivləşdir</option>
                  <option value="reject">Rədd et</option>
                  <option value="remove">Sil</option>
                </select>
              </div>
              <div>
                <label className="mb-1.5 block text-sm font-medium text-slate-700">Səbəb</label>
                <textarea
                  value={actionReason}
                  onChange={(e) => setActionReason(e.target.value)}
                  rows={2}
                  placeholder="İşəgötürənə göstəriləcək səbəb"
                  className="w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm outline-none focus:border-[#2563EB] focus:ring-2 focus:ring-blue-100"
                />
              </div>
              <div>
                <label className="mb-1.5 block text-sm font-medium text-slate-700">Daxili qeyd</label>
                <textarea
                  value={actionNote}
                  onChange={(e) => setActionNote(e.target.value)}
                  rows={2}
                  placeholder="Yalnız adminlər üçün"
                  className="w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm outline-none focus:border-[#2563EB] focus:ring-2 focus:ring-blue-100"
                />
              </div>
            </div>
            <div className="mt-6 flex gap-3">
              <button
                onClick={() => setShowJobAction(false)}
                className="flex-1 rounded-lg border border-slate-200 py-2.5 text-sm font-semibold text-slate-600 hover:bg-slate-50"
              >
                Ləğv et
              </button>
              <button
                onClick={() => run(() => adminReportApi.jobAction(report.id, jobAction, actionReason.trim() || undefined, actionNote.trim() || undefined))}
                disabled={busy || !jobAction}
                className="flex-1 rounded-lg bg-red-600 py-2.5 text-sm font-semibold text-white hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {busy ? <Loader2 className="mx-auto h-4 w-4 animate-spin" /> : "Təsdiqlə"}
              </button>
            </div>
          </div>
        </div>
      )}

      {showCompanyAction && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-6" onClick={() => setShowCompanyAction(false)}>
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-lg font-bold text-slate-900">Şirkət üzrə əməliyyat</h3>
            <p className="mt-1 text-sm text-slate-500">Əməliyyat seçin.</p>
            <div className="mt-5 space-y-4">
              <div>
                <label className="mb-1.5 block text-sm font-medium text-slate-700">
                  Əməliyyat <span className="text-red-500">*</span>
                </label>
                <select
                  value={companyAction}
                  onChange={(e) => setCompanyAction(e.target.value)}
                  className="w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm outline-none focus:border-[#2563EB]"
                >
                  <option value="">Seçin</option>
                  <option value="suspend">Dayandır</option>
                  <option value="reject">Rədd et</option>
                </select>
              </div>
              <div>
                <label className="mb-1.5 block text-sm font-medium text-slate-700">Səbəb</label>
                <textarea
                  value={actionReason}
                  onChange={(e) => setActionReason(e.target.value)}
                  rows={2}
                  placeholder="Şirkətə göstəriləcək səbəb"
                  className="w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm outline-none focus:border-[#2563EB] focus:ring-2 focus:ring-blue-100"
                />
              </div>
              <div>
                <label className="mb-1.5 block text-sm font-medium text-slate-700">Daxili qeyd</label>
                <textarea
                  value={actionNote}
                  onChange={(e) => setActionNote(e.target.value)}
                  rows={2}
                  placeholder="Yalnız adminlər üçün"
                  className="w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm outline-none focus:border-[#2563EB] focus:ring-2 focus:ring-blue-100"
                />
              </div>
            </div>
            <div className="mt-6 flex gap-3">
              <button
                onClick={() => setShowCompanyAction(false)}
                className="flex-1 rounded-lg border border-slate-200 py-2.5 text-sm font-semibold text-slate-600 hover:bg-slate-50"
              >
                Ləğv et
              </button>
              <button
                onClick={() => run(() => adminReportApi.companyAction(report.id, companyAction, actionReason.trim() || undefined, actionNote.trim() || undefined))}
                disabled={busy || !companyAction}
                className="flex-1 rounded-lg bg-red-600 py-2.5 text-sm font-semibold text-white hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {busy ? <Loader2 className="mx-auto h-4 w-4 animate-spin" /> : "Təsdiqlə"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
