"use client"

import { useCallback, useEffect, useState } from "react"
import Link from "next/link"
import { useParams, useRouter } from "next/navigation"
import { adminApi, type AdminJob, type AdminMe } from "@/lib/admin-api"
import {
  ArrowLeft,
  Loader2,
  Star,
  ArrowUp,
  Flame,
  Check,
  X,
  Send,
  Archive,
  Pause,
  Play,
  Trash2,
  Eye,
  MapPin,
  Building2,
  Clock,
} from "lucide-react"
import { cn } from "@/lib/utils"

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

function defaultEndDate(days: number): string {
  const d = new Date(Date.now() + days * 86400000)
  return d.toISOString().slice(0, 10)
}

export default function AdminJobDetailPage() {
  const params = useParams<{ id: string }>()
  const router = useRouter()
  const id = params.id

  const [job, setJob] = useState<AdminJob | null>(null)
  const [me, setMe] = useState<AdminMe | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")
  const [busy, setBusy] = useState(false)

  const [rejectOpen, setRejectOpen] = useState(false)
  const [rejectReason, setRejectReason] = useState("")
  const [rejectNote, setRejectNote] = useState("")

  const [premiumEnd, setPremiumEnd] = useState(defaultEndDate(30))
  const [featuredEnd, setFeaturedEnd] = useState(defaultEndDate(14))
  const [urgentEnd, setUrgentEnd] = useState(defaultEndDate(7))

  const fetchJob = useCallback(() => {
    setLoading(true)
    setError("")
    adminApi
      .getJob(id)
      .then(setJob)
      .catch((err) => setError(String(err)))
      .finally(() => setLoading(false))
  }, [id])

  useEffect(() => {
    fetchJob()
  }, [fetchJob])

  useEffect(() => {
    adminApi
      .me()
      .then(setMe)
      .catch(() => setMe(null))
  }, [])

  const run = async (fn: () => Promise<AdminJob>) => {
    setBusy(true)
    try {
      const updated = await fn()
      setJob(updated)
      setRejectOpen(false)
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

  if (error || !job) {
    return <div className="rounded-xl border border-red-200 bg-red-50 p-6 text-sm text-red-700">Xəta: {error}</div>
  }

  const can = (perm: string) => me?.permissions?.includes(perm) ?? false
  const canModerate = can("jobs.moderate")
  const canPublish = can("jobs.publish")
  const canPromote = can("jobs.promote")

  const moddable = job.status === "DRAFT" || job.status === "PENDING_REVIEW"

  return (
    <div className="space-y-6">
      <Link href="/admin/listings" className="inline-flex items-center gap-1.5 text-sm font-medium text-slate-500 hover:text-slate-800">
        <ArrowLeft className="h-4 w-4" /> Vakansiyalar
      </Link>

      <div className="flex flex-col gap-4 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm md:flex-row md:items-start md:justify-between">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="text-2xl font-bold text-slate-900">{job.title}</h1>
            {job.is_premium && <Star className="h-5 w-5 fill-amber-400 text-amber-400" />}
            {job.is_featured && <ArrowUp className="h-5 w-5 text-blue-500" />}
            {job.is_urgent && <Flame className="h-5 w-5 text-red-500" />}
          </div>
          <div className="mt-3 flex flex-wrap items-center gap-x-5 gap-y-2 text-sm text-slate-500">
            <span className="inline-flex items-center gap-1.5">
              <Building2 className="h-4 w-4 text-slate-400" /> {job.company_name || "—"}
            </span>
            <span className="inline-flex items-center gap-1.5">
              <MapPin className="h-4 w-4 text-slate-400" /> {job.location || "—"}
            </span>
            <span className="inline-flex items-center gap-1.5">
              <Eye className="h-4 w-4 text-slate-400" /> {job.views} baxış
            </span>
            <span className="inline-flex items-center gap-1.5">
              <Clock className="h-4 w-4 text-slate-400" /> {fmtDate(job.created_at)}
            </span>
          </div>
          <div className="mt-4 flex flex-wrap items-center gap-2">
            <span className={cn("rounded-full px-3 py-1 text-xs font-semibold", STATUS_COLORS[job.status] || "bg-slate-100 text-slate-600")}>
              {STATUS_LABELS[job.status] || job.status}
            </span>
            {job.salary_min || job.salary_max ? (
              <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-700">
                {job.salary_min ? job.salary_min.toLocaleString("az-AZ") : "—"} – {job.salary_max ? job.salary_max.toLocaleString("az-AZ") : "—"} {job.salary_currency || ""}
              </span>
            ) : null}
            {job.employment_type ? (
              <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-700">
                {job.employment_type.replace(/_/g, " ")}
              </span>
            ) : null}
            {job.work_mode ? (
              <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-700">
                {job.work_mode.replace(/_/g, " ")}
              </span>
            ) : null}
          </div>
        </div>

        <div className="flex shrink-0 flex-col gap-2 md:w-64">
          {moddable && canModerate && (
            <div className="flex gap-2">
              <button
                onClick={() => run(() => adminApi.moderate(job.id, "approve"))}
                disabled={busy}
                className="flex flex-1 items-center justify-center gap-1.5 rounded-lg bg-emerald-600 px-3 py-2.5 text-sm font-semibold text-white transition hover:bg-emerald-700 disabled:opacity-50"
              >
                <Check className="h-4 w-4" /> Təsdiqlə
              </button>
              <button
                onClick={() => setRejectOpen(true)}
                disabled={busy}
                className="flex flex-1 items-center justify-center gap-1.5 rounded-lg border border-red-200 bg-red-50 px-3 py-2.5 text-sm font-semibold text-red-600 transition hover:bg-red-100 disabled:opacity-50"
              >
                <X className="h-4 w-4" /> Rədd et
              </button>
            </div>
          )}
          {canPublish && (
            <>
              {job.status !== "PUBLISHED" ? (
                <button
                  onClick={() => run(() => adminApi.changeStatus(job.id, "publish"))}
                  disabled={busy}
                  className="flex items-center justify-center gap-1.5 rounded-lg bg-[#2563EB] px-3 py-2.5 text-sm font-semibold text-white transition hover:bg-[#1D4ED8] disabled:opacity-50"
                >
                  <Send className="h-4 w-4" /> Yayımla
                </button>
              ) : (
                <button
                  onClick={() => run(() => adminApi.changeStatus(job.id, "unpublish"))}
                  disabled={busy}
                  className="flex items-center justify-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm font-semibold text-slate-600 transition hover:bg-slate-50 disabled:opacity-50"
                >
                  <Pause className="h-4 w-4" /> Yayımdan götür
                </button>
              )}
              {job.status === "ARCHIVED" && (
                <button
                  onClick={() => run(() => adminApi.changeStatus(job.id, "restore"))}
                  disabled={busy}
                  className="flex items-center justify-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm font-semibold text-slate-600 transition hover:bg-slate-50 disabled:opacity-50"
                >
                  <Play className="h-4 w-4" /> Bərpa et
                </button>
              )}
              <button
                onClick={() => {
                  if (confirm("Vakansiyanı arxivləşdirmək istəyirsiniz?")) {
                    run(() => adminApi.changeStatus(job.id, "archive"))
                  }
                }}
                disabled={busy}
                className="flex items-center justify-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm font-semibold text-slate-600 transition hover:bg-slate-50 disabled:opacity-50"
              >
                <Archive className="h-4 w-4" /> Arxivləşdir
              </button>
            </>
          )}
          {can("jobs.delete") && (
            <button
              onClick={() => {
                if (confirm("Vakansiya silinsin? Bu əməliyyat geri qaytarıla bilməz.")) {
                  adminApi.deleteJob(job.id).then(() => router.push("/admin/listings")).catch(() => alert("Silinmə uğursuz oldu"))
                }
              }}
              disabled={busy}
              className="flex items-center justify-center gap-1.5 rounded-lg border border-red-200 bg-white px-3 py-2.5 text-sm font-semibold text-red-600 transition hover:bg-red-50 disabled:opacity-50"
            >
              <Trash2 className="h-4 w-4" /> Sil
            </button>
          )}
        </div>
      </div>

      {job.moderation_reason && (
        <div className="rounded-2xl border border-red-200 bg-red-50 p-5">
          <div className="text-sm font-bold text-red-700">Rədd səbəbi</div>
          <p className="mt-1 text-sm text-red-600">{job.moderation_reason}</p>
          {job.moderation_note && <p className="mt-2 text-xs text-red-400">Qeyd: {job.moderation_note}</p>}
        </div>
      )}

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          {canPromote && (
            <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
              <h2 className="mb-5 text-sm font-bold text-slate-900">Promosiyalar</h2>
              <div className="space-y-4">
                <div className="flex flex-wrap items-end justify-between gap-4 rounded-xl border border-slate-100 bg-slate-50/60 p-4">
                  <div>
                    <div className="flex items-center gap-2 text-sm font-semibold text-slate-800">
                      <Star className={cn("h-4 w-4", job.is_premium ? "fill-amber-400 text-amber-400" : "text-slate-400")} />
                      Premium
                    </div>
                    <div className="mt-1 text-xs text-slate-500">
                      {job.is_premium ? `Aktiv · ${fmtDate(job.premium_since)} → ${fmtDate(job.premium_until)}` : "Aktiv deyil"}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <input
                      type="date"
                      value={premiumEnd}
                      onChange={(e) => setPremiumEnd(e.target.value)}
                      className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs outline-none focus:border-[#2563EB]"
                    />
                    <button
                      onClick={() => run(() => adminApi.setPremium(job.id, !job.is_premium, job.is_premium ? undefined : `${premiumEnd}T00:00:00Z`))}
                      disabled={busy}
                      className={cn(
                        "rounded-lg px-4 py-2 text-xs font-semibold text-white transition disabled:opacity-50",
                        job.is_premium ? "bg-slate-500 hover:bg-slate-600" : "bg-amber-500 hover:bg-amber-600"
                      )}
                    >
                      {job.is_premium ? "Bağla" : "Aktivləşdir"}
                    </button>
                  </div>
                </div>

                <div className="flex flex-wrap items-end justify-between gap-4 rounded-xl border border-slate-100 bg-slate-50/60 p-4">
                  <div>
                    <div className="flex items-center gap-2 text-sm font-semibold text-slate-800">
                      <ArrowUp className={cn("h-4 w-4", job.is_featured ? "text-blue-500" : "text-slate-400")} />
                      Featured
                    </div>
                    <div className="mt-1 text-xs text-slate-500">
                      {job.is_featured ? `Aktiv · ${fmtDate(job.featured_since)} → ${fmtDate(job.featured_until)}` : "Aktiv deyil"}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <input
                      type="date"
                      value={featuredEnd}
                      onChange={(e) => setFeaturedEnd(e.target.value)}
                      className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs outline-none focus:border-[#2563EB]"
                    />
                    <button
                      onClick={() => run(() => adminApi.setFeatured(job.id, !job.is_featured, job.is_featured ? undefined : `${featuredEnd}T00:00:00Z`))}
                      disabled={busy}
                      className={cn(
                        "rounded-lg px-4 py-2 text-xs font-semibold text-white transition disabled:opacity-50",
                        job.is_featured ? "bg-slate-500 hover:bg-slate-600" : "bg-blue-500 hover:bg-blue-600"
                      )}
                    >
                      {job.is_featured ? "Bağla" : "Aktivləşdir"}
                    </button>
                  </div>
                </div>

                <div className="flex flex-wrap items-end justify-between gap-4 rounded-xl border border-slate-100 bg-slate-50/60 p-4">
                  <div>
                    <div className="flex items-center gap-2 text-sm font-semibold text-slate-800">
                      <Flame className={cn("h-4 w-4", job.is_urgent ? "text-red-500" : "text-slate-400")} />
                      Təcili
                    </div>
                    <div className="mt-1 text-xs text-slate-500">
                      {job.is_urgent ? `Aktiv · bitmə: ${fmtDate(job.urgent_until)}` : "Aktiv deyil"}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <input
                      type="date"
                      value={urgentEnd}
                      onChange={(e) => setUrgentEnd(e.target.value)}
                      className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs outline-none focus:border-[#2563EB]"
                    />
                    <button
                      onClick={() => run(() => adminApi.setUrgent(job.id, !job.is_urgent, job.is_urgent ? undefined : `${urgentEnd}T00:00:00Z`))}
                      disabled={busy}
                      className={cn(
                        "rounded-lg px-4 py-2 text-xs font-semibold text-white transition disabled:opacity-50",
                        job.is_urgent ? "bg-slate-500 hover:bg-slate-600" : "bg-red-500 hover:bg-red-600"
                      )}
                    >
                      {job.is_urgent ? "Bağla" : "Aktivləşdir"}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <h2 className="mb-4 text-sm font-bold text-slate-900">Təsvir</h2>
            <p className="whitespace-pre-line text-sm leading-relaxed text-slate-600">{job.description || "Təsvir yoxdur"}</p>
            {job.requirements && (
              <>
                <h3 className="mb-2 mt-6 text-sm font-bold text-slate-900">Tələblər</h3>
                <p className="whitespace-pre-line text-sm leading-relaxed text-slate-600">{job.requirements}</p>
              </>
            )}
          </div>
        </div>

        <div className="space-y-6">
          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <h2 className="mb-4 text-sm font-bold text-slate-900">Moderasiya tarixçəsi</h2>
            {!job.moderation_history || job.moderation_history.length === 0 ? (
              <div className="py-4 text-center text-xs text-slate-400">Tarixçə yoxdur</div>
            ) : (
              <ol className="relative space-y-4 border-l border-slate-200 pl-4">
                {job.moderation_history.map((h) => (
                  <li key={h.id} className="relative">
                    <span className="absolute -left-[21px] top-1.5 h-2.5 w-2.5 rounded-full border-2 border-white bg-[#2563EB]" />
                    <div className="text-xs font-semibold text-slate-800">
                      {STATUS_LABELS[h.from_status || ""] || h.from_status || "—"} → {STATUS_LABELS[h.to_status] || h.to_status}
                    </div>
                    <div className="mt-0.5 text-[11px] text-slate-400">
                      {h.actor_email} · {fmtDate(h.created_at)}
                    </div>
                    {h.reason && <div className="mt-1 text-[11px] text-red-600">Səbəb: {h.reason}</div>}
                    {h.note && <div className="mt-0.5 text-[11px] text-slate-500">Qeyd: {h.note}</div>}
                  </li>
                ))}
              </ol>
            )}
          </div>
        </div>
      </div>

      {rejectOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-6" onClick={() => setRejectOpen(false)}>
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-lg font-bold text-slate-900">Vakansiyanı rədd et</h3>
            <p className="mt-1 text-sm text-slate-500">İşəgötürənə göstəriləcək rədd səbəbini daxil edin.</p>
            <div className="mt-5 space-y-4">
              <div>
                <label className="mb-1.5 block text-sm font-medium text-slate-700">
                  Rədd səbəbi <span className="text-red-500">*</span>
                </label>
                <textarea
                  value={rejectReason}
                  onChange={(e) => setRejectReason(e.target.value)}
                  rows={3}
                  placeholder="Məsələn: Tələb olunan sənədlər əskikdir"
                  className="w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm outline-none focus:border-[#2563EB] focus:ring-2 focus:ring-blue-100"
                />
              </div>
              <div>
                <label className="mb-1.5 block text-sm font-medium text-slate-700">Daxili qeyd (opsional)</label>
                <textarea
                  value={rejectNote}
                  onChange={(e) => setRejectNote(e.target.value)}
                  rows={2}
                  placeholder="Yalnız adminlər üçün"
                  className="w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm outline-none focus:border-[#2563EB] focus:ring-2 focus:ring-blue-100"
                />
              </div>
            </div>
            <div className="mt-6 flex gap-3">
              <button
                onClick={() => setRejectOpen(false)}
                className="flex-1 rounded-lg border border-slate-200 py-2.5 text-sm font-semibold text-slate-600 hover:bg-slate-50"
              >
                Ləğv et
              </button>
              <button
                onClick={() => run(() => adminApi.moderate(job.id, "reject", rejectReason.trim(), rejectNote.trim() || undefined))}
                disabled={busy || !rejectReason.trim()}
                className="flex-1 rounded-lg bg-red-600 py-2.5 text-sm font-semibold text-white hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {busy ? <Loader2 className="mx-auto h-4 w-4 animate-spin" /> : "Rədd et"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}