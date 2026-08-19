"use client"

import { useCallback, useEffect, useState } from "react"
import Link from "next/link"
import { useParams, useRouter } from "next/navigation"
import { adminApi, type AdminMe } from "@/lib/admin-api"
import {
  ArrowLeft,
  Loader2,
  ShieldCheck,
  BadgeCheck,
  BadgeX,
  Archive,
  RotateCcw,
  Star,
  Building2,
  MapPin,
  Calendar,
  Eye,
  Star as StarIcon,
  Check,
  X,
  Archive as ArchiveIcon,
  Pause,
  DollarSign,
} from "lucide-react"
import { cn } from "@/lib/utils"

const STATUS_LABELS: Record<string, string> = {
  DRAFT: "Qaralama",
  PENDING_REVIEW: "Gözləmədə",
  APPROVED: "Təsdiqlənib",
  REJECTED: "Rədd edilib",
  PUBLISHED: "Yayımlandıb",
  PAUSED: "Dayandırılıb",
  EXPIRED: "Vaxtı bitib",
  ARCHIVED: "Arxivleşib",
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

const FORMAT_LABELS: Record<string, string> = {
  ONLINE: "Onlayn",
  OFFLINE: "Ofis",
  HYBRID: "Hibrid",
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

export default function AdminTrainingDetailPage() {
  const params = useParams<{ id: string }>()
  const router = useRouter()
  const id = params.id

  const [training, setTraining] = useState<any | null>(null)
  const [me, setMe] = useState<any | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")
  const [busy, setBusy] = useState(false)

  const [rejectOpen, setRejectOpen] = useState(false)
  const [rejectReason, setRejectReason] = useState("")
  const [rejectNote, setRejectNote] = useState("")

  const [featuredEnd, setFeaturedEnd] = useState(defaultEndDate(30))

  const fetchTraining = useCallback(() => {
    setLoading(true)
    setError("")
    adminApi
      .getTraining(id)
      .then(setTraining)
      .catch((err) => setError(String(err)))
      .finally(() => setLoading(false))
  }, [id])

  useEffect(() => {
    fetchTraining()
  }, [fetchTraining])

  useEffect(() => {
    adminApi
      .me()
      .then(setMe)
      .catch(() => setMe(null))
  }, [])

  const run = async (fn: () => Promise<any>) => {
    setBusy(true)
    try {
      const updated = await fn()
      setTraining(updated)
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

  if (error || !training) {
    return <div className="rounded-xl border border-red-200 bg-red-50 p-6 text-sm text-red-700">Xəta: {error}</div>
  }

  const can = (perm: string) => me?.permissions?.includes(perm) ?? false
  const canManage = training.canManage ?? false

  return (
    <div className="space-y-6">
      <Link href="/admin/trainings" className="inline-flex items-center gap-1.5 text-sm font-medium text-slate-500 hover:text-slate-800">
        <ArrowLeft className="h-4 w-4" /> Təlimlər
      </Link>

      <div className="flex flex-col gap-4 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm md:flex-row md:items-start md:justify-between">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="text-2xl font-bold text-slate-900">{training.title}</h1>
          </div>
          <div className="mt-3 flex flex-wrap items-center gap-x-5 gap-y-2 text-sm text-slate-500">
            <span className="inline-flex items-center gap-1.5">
              <Building2 className="h-4 w-4 text-slate-400" /> {training.provider_name || "—"}
            </span>
            <span className="inline-flex items-center gap-1.5">
              <MapPin className="h-4 w-4 text-slate-400" /> {training.location || "—"}
            </span>
            <span className="inline-flex items-center gap-1.5">
              <Eye className="h-4 w-4 text-slate-400" /> {training.views || 0} baxış
            </span>
            <span className="inline-flex items-center gap-1.5">
              <Calendar className="h-4 w-4 text-slate-400" /> {fmtDate(training.created_at)}
            </span>
          </div>
          <div className="mt-4 flex flex-wrap items-center gap-2">
            <span className={cn("rounded-full px-3 py-1 text-xs font-semibold", STATUS_COLORS[training.status] || "bg-slate-100 text-slate-600")}>
              {STATUS_LABELS[training.status] || training.status}
            </span>
            {training.is_featured && (
              <span className="rounded-full bg-amber-100 px-3 py-1 text-xs font-semibold text-amber-700">
                Özəl (bitmə: {new Date(training.featured_until).toLocaleDateString("az-AZ")})
              </span>
            )}
            <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-700">
              {FORMAT_LABELS[training.format] || training.format || "—"}
            </span>
            <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-700">
              {training.price !== null && training.price !== undefined
                ? `${training.price} ${training.currency || "AZN"}`
                : "Pulsuz"}
            </span>
          </div>
        </div>

        <div className="flex shrink-0 flex-col gap-2 md:w-80">
          {training.status === "DRAFT" || training.status === "PENDING_REVIEW" ? (
            <div className="flex gap-2">
              <button
                onClick={() => run(() => adminApi.changeTrainingStatus(training.id, "approve"))}
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
          ) : null}

          {training.status === "APPROVED" && (
            <button
              onClick={() => run(() => adminApi.changeTrainingStatus(training.id, "publish"))}
              disabled={busy}
              className="flex items-center justify-center gap-1.5 rounded-lg bg-[#2563EB] px-3 py-2.5 text-sm font-semibold text-white transition hover:bg-[#1D4ED8] disabled:opacity-50"
            >
              <Eye className="h-4 w-4" /> Yayımla
            </button>
          )}

          {training.status === "PUBLISHED" && (
            <button
              onClick={() => run(() => adminApi.changeTrainingStatus(training.id, "unpublish"))}
              disabled={busy}
              className="flex items-center justify-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm font-semibold text-slate-600 transition hover:bg-slate-50 disabled:opacity-50"
            >
              <Pause className="h-4 w-4" /> Yayımdan götür
            </button>
          )}

          {training.status === "PUBLISHED" && (
            <button
              onClick={() => run(() => adminApi.changeTrainingStatus(training.id, "feature"))}
              disabled={busy}
              className="flex items-center justify-center gap-1.5 rounded-lg bg-amber-500 px-3 py-2.5 text-sm font-semibold text-white transition hover:bg-amber-600 disabled:opacity-50"
            >
              <Star className="h-4 w-4" /> Özəl et
            </button>
          )}

          {training.is_featured && (
            <button
              onClick={() => run(() => adminApi.changeTrainingStatus(training.id, "feature"))}
              disabled={busy}
              className="flex items-center justify-center gap-1.5 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2.5 text-sm font-semibold text-amber-600 transition hover:bg-amber-100 disabled:opacity-50"
            >
              <Star className="h-4 w-4" /> Özel statusu ləğv et
            </button>
          )}

          {training.status === "ARCHIVED" && (
            <button
              onClick={() => run(() => adminApi.changeTrainingStatus(training.id, "restore"))}
              disabled={busy}
              className="flex items-center justify-center gap-1.5 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2.5 text-sm font-semibold text-emerald-600 transition hover:bg-emerald-100 disabled:opacity-50"
            >
              <RotateCcw className="h-4 w-4" /> Bərpa et
            </button>
          )}

          <button
            onClick={() => {
              if (confirm("Təlimi arxivləşdirmək istəyirsiniz? Bu əməliyyat geri qaytarıla bilər.")) {
                run(() => adminApi.changeTrainingStatus(training.id, "archive"))
              }
            }}
            disabled={busy}
            className="flex items-center justify-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm font-semibold text-slate-600 transition hover:bg-slate-50 disabled:opacity-50"
          >
            <Archive className="h-4 w-4" /> Arxivləşdir
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <h2 className="mb-5 text-sm font-bold text-slate-900">Təsvir</h2>
            <p className="whitespace-pre-line text-sm leading-relaxed text-slate-600">{training.description || "Təsvir yoxdur"}</p>
          </div>
        </div>

        <div className="space-y-6">
          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <h2 className="mb-5 text-sm font-bold text-slate-900">Məlumatlar</h2>
            <div className="space-y-4">
              <div className="flex flex-wrap gap-4">
                <div className="flex-1 min-w-[200px] rounded-xl border border-slate-100 bg-slate-50/60 p-4">
                  <div className="flex items-center gap-2 text-sm font-semibold text-slate-800">
                    <Building2 className="h-4 w-4 text-slate-400" /> Təlimçi
                  </div>
                  <div className="mt-1 truncate text-sm text-slate-600">{training.provider_name || "—"}</div>
                </div>
                <div className="flex-1 min-w-[200px] rounded-xl border border-slate-100 bg-slate-50/60 p-4">
                  <div className="flex items-center gap-2 text-sm font-semibold text-slate-800">
                    <MapPin className="h-4 w-4 text-slate-400" /> Yerləşmə
                  </div>
                  <div className="mt-1 truncate text-sm text-slate-600">{training.location || "—"}</div>
                </div>
                <div className="flex-1 min-w-[200px] rounded-xl border border-slate-100 bg-slate-50/60 p-4">
                  <div className="flex items-center gap-2 text-sm font-semibold text-slate-800">
                    <DollarSign className="h-4 w-4 text-slate-400" /> Qiymət
                  </div>
                  <div className="mt-1 text-sm text-slate-600">
                    {training.price !== null && training.price !== undefined
                      ? `${training.price} ${training.currency || "AZN"}`
                      : "Pulsuz"}
                  </div>
                </div>
                <div className="flex-1 min-w-[200px] rounded-xl border border-slate-100 bg-slate-50/60 p-4">
                  <div className="flex items-center gap-2 text-sm font-semibold text-slate-800">
                    <Calendar className="h-4 w-4 text-slate-400" /> Başlama
                  </div>
                  <div className="mt-1 text-sm text-slate-600">{fmtDate(training.start_date)}</div>
                </div>
                <div className="flex-1 min-w-[200px] rounded-xl border border-slate-100 bg-slate-50/60 p-4">
                  <div className="flex items-center gap-2 text-sm font-semibold text-slate-800">
                    <Calendar className="h-4 w-4 text-slate-400" /> Bitmə
                  </div>
                  <div className="mt-1 text-sm text-slate-600">{fmtDate(training.end_date)}</div>
                </div>
                <div className="flex-1 min-w-[200px] rounded-xl border border-slate-100 bg-slate-50/60 p-4">
                  <div className="flex items-center gap-2 text-sm font-semibold text-slate-800">
                    <Calendar className="h-4 w-4 text-slate-400" /> Müraciət son tarixi
                  </div>
                  <div className="mt-1 text-sm text-slate-600">{fmtDate(training.application_deadline)}</div>
                </div>
                <div className="flex-1 min-w-[200px] rounded-xl border border-slate-100 bg-slate-50/60 p-4">
                  <div className="flex items-center gap-2 text-sm font-semibold text-slate-800">
                    <Calendar className="h-4 w-4 text-slate-400" /> Yaradılma
                  </div>
                  <div className="mt-1 text-sm text-slate-600">{fmtDate(training.created_at)}</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

