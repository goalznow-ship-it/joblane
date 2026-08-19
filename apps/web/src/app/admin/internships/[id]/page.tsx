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
  Pause,
  Archive as ArchiveIcon,
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

const WORK_MODE_LABELS: Record<string, string> = {
  ON_SITE: "Ofis",
  REMOTE: "Uzaqdan",
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

export default function AdminInternshipDetailPage() {
  const params = useParams<{ id: string }>()
  const router = useRouter()
  const id = params.id

  const [internship, setInternship] = useState<any | null>(null)
  const [me, setMe] = useState<any | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")
  const [busy, setBusy] = useState(false)

  const [rejectOpen, setRejectOpen] = useState(false)
  const [rejectReason, setRejectReason] = useState("")
  const [rejectNote, setRejectNote] = useState("")

  const [featuredEnd, setFeaturedEnd] = useState(defaultEndDate(30))

  const fetchInternship = useCallback(() => {
    setLoading(true)
    setError("")
    adminApi
      .getInternship(id)
      .then(setInternship)
      .catch((err) => setError(String(err)))
      .finally(() => setLoading(false))
  }, [id])

  useEffect(() => {
    fetchInternship()
  }, [fetchInternship])

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
      setInternship(updated)
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

  if (error || !internship) {
    return <div className="rounded-xl border border-red-200 bg-red-50 p-6 text-sm text-red-700">Xəta: {error}</div>
  }

  const can = (perm: string) => me?.permissions?.includes(perm) ?? false
  const canManage = internship.canManage ?? false

  return (
    <div className="space-y-6">
      <Link href="/admin/internships" className="inline-flex items-center gap-1.5 text-sm font-medium text-slate-500 hover:text-slate-800">
        <ArrowLeft className="h-4 w-4" /> Təcrübə proqramları
      </Link>

      <div className="flex flex-col gap-4 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm md:flex-row md:items-start md:justify-between">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="text-2xl font-bold text-slate-900">{internship.title}</h1>
          </div>
          <div className="mt-3 flex flex-wrap items-center gap-x-5 gap-y-2 text-sm text-slate-500">
            <span className="inline-flex items-center gap-1.5">
              <Building2 className="h-4 w-4 text-slate-400" /> {internship.company_name || "—"}
            </span>
            <span className="inline-flex items-center gap-1.5">
              <MapPin className="h-4 w-4 text-slate-400" /> {internship.location || "—"}
            </span>
            <span className="inline-flex items-center gap-1.5">
              <Eye className="h-4 w-4 text-slate-400" /> {internship.views || 0} baxış
            </span>
            <span className="inline-flex items-center gap-1.5">
              <Calendar className="h-4 w-4 text-slate-400" /> {fmtDate(internship.created_at)}
            </span>
          </div>
          <div className="mt-4 flex flex-wrap items-center gap-2">
            <span className={cn("rounded-full px-3 py-1 text-xs font-semibold", STATUS_COLORS[internship.status] || "bg-slate-100 text-slate-600")}>
              {STATUS_LABELS[internship.status] || internship.status}
            </span>
            {internship.is_featured && (
              <span className="rounded-full bg-amber-100 px-3 py-1 text-xs font-semibold text-amber-700">
                Özəl (bitmə: {new Date(internship.featured_until).toLocaleDateString("az-AZ")})
              </span>
            )}
            <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-700">
              {WORK_MODE_LABELS[internship.work_mode] || internship.work_mode || "—"}
            </span>
            <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-700">
              {internship.start_date ? new Date(internship.start_date).toLocaleDateString("az-AZ") : "—"} – {internship.end_date ? new Date(internship.end_date).toLocaleDateString("az-AZ") : "—"}
            </span>
          </div>
        </div>

        <div className="flex shrink-0 flex-col gap-2 md:w-80">
          {internship.status === "DRAFT" || internship.status === "PENDING_REVIEW" ? (
            <div className="flex gap-2">
              <button
                onClick={() => run(() => adminApi.changeInternshipStatus(internship.id, "approve"))}
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

          {internship.status === "APPROVED" && (
            <button
              onClick={() => run(() => adminApi.changeInternshipStatus(internship.id, "publish"))}
              disabled={busy}
              className="flex items-center justify-center gap-1.5 rounded-lg bg-[#2563EB] px-3 py-2.5 text-sm font-semibold text-white transition hover:bg-[#1D4ED8] disabled:opacity-50"
            >
              <Eye className="h-4 w-4" /> Yayımla
            </button>
          )}

          {internship.status === "PUBLISHED" && (
            <button
              onClick={() => run(() => adminApi.changeInternshipStatus(internship.id, "unpublish"))}
              disabled={busy}
              className="flex items-center justify-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm font-semibold text-slate-600 transition hover:bg-slate-50 disabled:opacity-50"
            >
              <Pause className="h-4 w-4" /> Yayımdan götür
            </button>
          )}

          {internship.status === "PUBLISHED" && (
            <button
              onClick={() => run(() => adminApi.changeInternshipStatus(internship.id, "feature"))}
              disabled={busy}
              className="flex items-center justify-center gap-1.5 rounded-lg bg-amber-500 px-3 py-2.5 text-sm font-semibold text-white transition hover:bg-amber-600 disabled:opacity-50"
            >
              <Star className="h-4 w-4" /> Özəl et
            </button>
          )}

          {internship.is_featured && (
            <button
              onClick={() => run(() => adminApi.changeInternshipStatus(internship.id, "feature"))}
              disabled={busy}
              className="flex items-center justify-center gap-1.5 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2.5 text-sm font-semibold text-amber-600 transition hover:bg-amber-100 disabled:opacity-50"
            >
              <Star className="h-4 w-4" /> Özel statusu ləğv et
            </button>
          )}

          {internship.status === "ARCHIVED" && (
            <button
              onClick={() => run(() => adminApi.changeInternshipStatus(internship.id, "restore"))}
              disabled={busy}
              className="flex items-center justify-center gap-1.5 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2.5 text-sm font-semibold text-emerald-600 transition hover:bg-emerald-100 disabled:opacity-50"
            >
              <RotateCcw className="h-4 w-4" /> Bərpa et
            </button>
          )}

          <button
            onClick={() => {
              if (confirm("Təcrübə proqramını arxivləşdirmək istəyirsiniz? Bu əməliyyat geri qaytarıla bilər.")) {
                run(() => adminApi.changeInternshipStatus(internship.id, "archive"))
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
            <p className="whitespace-pre-line text-sm leading-relaxed text-slate-600">{internship.description || "Təsvir yoxdur"}</p>
            {internship.requirements && (
              <>
                <h3 className="mb-2 mt-6 text-sm font-bold text-slate-900">Tələblər</h3>
                <p className="whitespace-pre-line text-sm leading-relaxed text-slate-600">{internship.requirements}</p>
              </>
            )}
          </div>
        </div>

        <div className="space-y-6">
          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <h2 className="mb-5 text-sm font-bold text-slate-900">Məlumatlar</h2>
            <div className="space-y-4">
              <div className="flex flex-wrap gap-4">
                <div className="flex-1 min-w-[200px] rounded-xl border border-slate-100 bg-slate-50/60 p-4">
                  <div className="flex items-center gap-2 text-sm font-semibold text-slate-800">
                    <Building2 className="h-4 w-4 text-slate-400" /> Şirkət
                  </div>
                  <div className="mt-1 truncate text-sm text-slate-600">{internship.company_name || "—"}</div>
                </div>
                <div className="flex-1 min-w-[200px] rounded-xl border border-slate-100 bg-slate-50/60 p-4">
                  <div className="flex items-center gap-2 text-sm font-semibold text-slate-800">
                    <MapPin className="h-4 w-4 text-slate-400" /> Yerləşmə
                  </div>
                  <div className="mt-1 truncate text-sm text-slate-600">{internship.location || "—"}</div>
                </div>
                <div className="flex-1 min-w-[200px] rounded-xl border border-slate-100 bg-slate-50/60 p-4">
                  <div className="flex items-center gap-2 text-sm font-semibold text-slate-800">
                    <Calendar className="h-4 w-4 text-slate-400" /> Başlama
                  </div>
                  <div className="mt-1 text-sm text-slate-600">{fmtDate(internship.start_date)}</div>
                </div>
                <div className="flex-1 min-w-[200px] rounded-xl border border-slate-100 bg-slate-50/60 p-4">
                  <div className="flex items-center gap-2 text-sm font-semibold text-slate-800">
                    <Calendar className="h-4 w-4 text-slate-400" /> Bitmə
                  </div>
                  <div className="mt-1 text-sm text-slate-600">{fmtDate(internship.end_date)}</div>
                </div>
                <div className="flex-1 min-w-[200px] rounded-xl border border-slate-100 bg-slate-50/60 p-4">
                  <div className="flex items-center gap-2 text-sm font-semibold text-slate-800">
                    <Calendar className="h-4 w-4 text-slate-400" /> Yaradılma
                  </div>
                  <div className="mt-1 text-sm text-slate-600">{fmtDate(internship.created_at)}</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
