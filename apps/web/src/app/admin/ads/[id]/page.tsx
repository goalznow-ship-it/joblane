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
  Play,
  Image as ImageIcon,
  Upload,
  Clock,
  Calendar as CalendarIcon,
  Globe,
  MoreVertical,
  Trash2,
  Edit2,
} from "lucide-react"
import { cn } from "@/lib/utils"

const STATUS_LABELS: Record<string, string> = {
  DRAFT: "Qaralama",
  SCHEDULED: "Planlaşdırılıb",
  ACTIVE: "Aktiv",
  PAUSED: "Dayandırılıb",
  EXPIRED: "Vaxtı bitib",
  ARCHIVED: "Arxivləşib",
}

const STATUS_COLORS: Record<string, string> = {
  DRAFT: "bg-slate-100 text-slate-600",
  SCHEDULED: "bg-blue-100 text-blue-700",
  ACTIVE: "bg-emerald-100 text-emerald-700",
  PAUSED: "bg-orange-100 text-orange-700",
  EXPIRED: "bg-slate-100 text-slate-500",
  ARCHIVED: "bg-slate-100 text-slate-500",
}

const PLACEMENT_LABELS: Record<string, string> = {
  TOP_LEADERBOARD: "TOP_LEADERBOARD",
  LEFT_SKIN: "LEFT_SKIN",
  RIGHT_SKIN: "RIGHT_SKIN",
  RIGHT_SIDEBAR: "RIGHT_SIDEBAR",
  INLINE_FEED: "INLINE_FEED",
  MOBILE_BANNER: "MOBILE_BANNER",
}

const FORMAT_LABELS: Record<string, string> = {
  "970x90": "970x90",
  "160x600": "160x600",
  "120x600": "120x600",
  "300x250": "300x250",
  "728x90": "728x90",
  "320x100": "320x100",
  CUSTOM_SKIN: "CUSTOM_SKIN",
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

export default function AdminAdDetailPage() {
  const params = useParams<{ id: string }>()
  const router = useRouter()
  const id = params.id

  const [ad, setAd] = useState<any | null>(null)
  const [me, setMe] = useState<any | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")
  const [busy, setBusy] = useState(false)

  const [previewOpen, setPreviewOpen] = useState(false)

  const [editForm, setEditForm] = useState<Record<string, string>>({})
  const [desktopFile, setDesktopFile] = useState<File | null>(null)
  const [mobileFile, setMobileFile] = useState<File | null>(null)
  const [uploadingCreative, setUploadingCreative] = useState(false)

  const fetchAd = useCallback(() => {
    setLoading(true)
    setError("")
    adminApi
      .getAd(id)
      .then(setAd)
      .catch((err) => setError(String(err)))
      .finally(() => setLoading(false))
  }, [id])

  useEffect(() => {
    fetchAd()
  }, [fetchAd])

  useEffect(() => {
    if (ad) {
      setEditForm({
        advertiser_name: ad.advertiser_name ?? "",
        campaign_name: ad.campaign_name ?? "",
        industry: ad.industry ?? "",
        headline: ad.headline ?? "",
        description: ad.description ?? "",
        cta_label: ad.cta_label ?? "",
        destination_url: ad.destination_url ?? "",
        alt_text: ad.alt_text ?? "",
        placement: ad.placement ?? "TOP_LEADERBOARD",
        format: ad.format ?? "970x90",
        background: ad.background ?? "blue",
        accent_color: ad.accent_color ?? "#2563EB",
        start_at: ad.start_at ? new Date(ad.start_at).toISOString().slice(0, 16) : "",
        end_at: ad.end_at ? new Date(ad.end_at).toISOString().slice(0, 16) : "",
        priority: String(ad.priority ?? 0),
      })
    }
  }, [ad])

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
      setAd(updated)
    } catch (err) {
      const detail = (err as any)?.detail
      alert(typeof detail === "string" ? detail : "Əməliyyat uğursuz oldu")
    } finally {
      setBusy(false)
    }
  }

  const handlePreview = () => {
    setPreviewOpen(true)
  }

  const setEdit = (key: string, value: string) => {
    setEditForm(prev => ({ ...prev, [key]: value }))
  }

  const handleCreativeUpload = async (file: File, mobile: boolean) => {
    setUploadingCreative(true)
    try {
      const res = await adminApi.uploadAdCreative(file, mobile)
      setEdit(mobile ? "mobile_image_url" : "creative_image_url", res.url)
      if (mobile) setMobileFile(file)
      else setDesktopFile(file)
      alert("Kreativ uğurla yükləndi")
    } catch (err) {
      alert(err instanceof Error ? err.message : "Yükləmə uğursuz oldu")
    } finally {
      setUploadingCreative(false)
    }
  }

  const handleUpdate = () => {
    run(() =>
      adminApi.updateAd(ad.id, {
        advertiser_name: editForm.advertiser_name || undefined,
        campaign_name: editForm.campaign_name || undefined,
        industry: editForm.industry || undefined,
        headline: editForm.headline || undefined,
        description: editForm.description || undefined,
        cta_label: editForm.cta_label || undefined,
        destination_url: editForm.destination_url || undefined,
        alt_text: editForm.alt_text || undefined,
        placement: editForm.placement || undefined,
        format: editForm.format || undefined,
        background: editForm.background || undefined,
        accent_color: editForm.accent_color || undefined,
        start_at: editForm.start_at || undefined,
        end_at: editForm.end_at || undefined,
        priority: Number(editForm.priority) || 0,
        creative_image_url: editForm.creative_image_url || ad.creative_image_url || undefined,
        mobile_image_url: editForm.mobile_image_url || ad.mobile_image_url || undefined,
      })
    )
  }

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center text-sm text-slate-400">
        <Loader2 className="mr-2 h-5 w-5 animate-spin text-[#2563EB]" /> Yüklənir...
      </div>
    )
  }

  if (error || !ad) {
    return <div className="rounded-xl border border-red-200 bg-red-50 p-6 text-sm text-red-700">Xəta: {error}</div>
  }

  const can = (perm: string) => me?.permissions?.includes(perm) ?? false
  const canManage = can("ads.manage")

  return (
    <div className="space-y-6">
      <Link href="/admin/ads" className="inline-flex items-center gap-1.5 text-sm font-medium text-slate-500 hover:text-slate-800">
        <ArrowLeft className="h-4 w-4" /> Reklamlar
      </Link>

      <div className="flex flex-col gap-4 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm md:flex-row md:items-start md:justify-between">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="text-2xl font-bold text-slate-900">{ad.campaign_name}</h1>
            {ad.is_featured && <Star className="h-5 w-5 fill-amber-400 text-amber-400" />}
          </div>
          <div className="mt-3 flex flex-wrap items-center gap-x-5 gap-y-2 text-sm text-slate-500">
            <span className="inline-flex items-center gap-1.5">
              <Building2 className="h-4 w-4 text-slate-400" /> {ad.advertiser_name}
            </span>
            <span className="inline-flex items-center gap-1.5">
              <Globe className="h-4 w-4 text-slate-400" /> {ad.destination_url}
            </span>
            <span className="inline-flex items-center gap-1.5">
              <Eye className="h-4 w-4 text-slate-400" /> {ad.impressions} baxış / {ad.clicks} klik
            </span>
            <span className="inline-flex items-center gap-1.5">
              <Calendar className="h-4 w-4 text-slate-400" /> {fmtDate(ad.created_at)}
            </span>
          </div>
          <div className="mt-4 flex flex-wrap items-center gap-2">
            <span className={cn("rounded-full px-3 py-1 text-xs font-semibold", STATUS_COLORS[ad.status] || "bg-slate-100 text-slate-600")}>
              {STATUS_LABELS[ad.status] || ad.status}
            </span>
            <span className="rounded-full bg-purple-100 px-3 py-1 text-xs font-semibold text-purple-700">
              {PLACEMENT_LABELS[ad.placement] || ad.placement}
            </span>
            <span className="rounded-full bg-purple-100 px-3 py-1 text-xs font-semibold text-purple-700">
              {FORMAT_LABELS[ad.format] || ad.format}
            </span>
            <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-700">
              Prioritet: {ad.priority}
            </span>
          </div>
        </div>

        <div className="flex shrink-0 flex-col gap-2 md:w-80">
          {canManage && (
            <div className="flex flex-wrap gap-2">
              {ad.status === "DRAFT" && (
                <button
                  onClick={() => run(() => adminApi.changeAdStatus(ad.id, "schedule"))}
                  disabled={busy}
                  className="flex items-center justify-center gap-1.5 rounded-lg bg-blue-600 px-3 py-2.5 text-sm font-semibold text-white transition hover:bg-blue-700 disabled:opacity-50"
                >
                  <Calendar className="h-4 w-4" /> Planlaşdır
                </button>
              )}
              {ad.status === "DRAFT" || ad.status === "SCHEDULED" ? (
                <button
                  onClick={() => run(() => adminApi.changeAdStatus(ad.id, "activate"))}
                  disabled={busy}
                  className="flex items-center justify-center gap-1.5 rounded-lg bg-emerald-600 px-3 py-2.5 text-sm font-semibold text-white transition hover:bg-emerald-700 disabled:opacity-50"
                >
                  <Play className="h-4 w-4" /> Aktiv et
                </button>
              ) : null}

              {ad.status === "ACTIVE" && (
                <button
                  onClick={() => run(() => adminApi.changeAdStatus(ad.id, "pause"))}
                  disabled={busy}
                  className="flex items-center justify-center gap-1.5 rounded-lg border border-orange-200 bg-orange-50 px-3 py-2.5 text-sm font-semibold text-orange-600 transition hover:bg-orange-100 disabled:opacity-50"
                >
                  <Pause className="h-4 w-4" /> Dayandır
                </button>
              )}

              {ad.status === "PAUSED" && (
                <button
                  onClick={() => run(() => adminApi.changeAdStatus(ad.id, "resume"))}
                  disabled={busy}
                  className="flex items-center justify-center gap-1.5 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2.5 text-sm font-semibold text-emerald-600 transition hover:bg-emerald-100 disabled:opacity-50"
                >
                  <Play className="h-4 w-4" /> Yenidən aktiv et
                </button>
              )}

              {ad.status === "ACTIVE" || ad.status === "PAUSED" ? (
                <button
                  onClick={() => run(() => adminApi.changeAdStatus(ad.id, "archive"))}
                  disabled={busy}
                  className="flex items-center justify-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm font-semibold text-slate-600 transition hover:bg-slate-50 disabled:opacity-50"
                >
                  <Archive className="h-4 w-4" /> Arxivləşdir
                </button>
              ) : null}

              <button
                onClick={handlePreview}
                disabled={busy}
                className="flex items-center justify-center gap-1.5 rounded-lg bg-purple-500 px-3 py-2.5 text-sm font-semibold text-white transition hover:bg-purple-600 disabled:opacity-50"
              >
                <Eye className="h-4 w-4" /> Önizləmə
              </button>
            </div>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <h2 className="mb-5 text-sm font-bold text-slate-900">Təsvir</h2>
            <p className="whitespace-pre-line text-sm leading-relaxed text-slate-600">{ad.description || "Təsvir yoxdur"}</p>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <h2 className="mb-5 text-sm font-bold text-slate-900">Kreativlər</h2>
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <div className="rounded-xl border border-slate-200 bg-white p-4">
                <h3 className="mb-3 text-sm font-semibold text-slate-700">Desktop Kreativ</h3>
                {ad.creative_image_url ? (
                  <img
                    src={ad.creative_image_url}
                    alt={ad.alt_text || ad.campaign_name}
                    className="w-full h-auto rounded-lg border border-slate-200 object-contain"
                  />
                ) : (
                  <div className="w-full h-48 rounded-lg border-2 border-dashed border-slate-300 flex items-center justify-center text-slate-400">
                    Kreativ yoxdur
                  </div>
                )}
              </div>
              <div className="rounded-xl border border-slate-200 bg-white p-4">
                <h3 className="mb-3 text-sm font-semibold text-slate-700">Mobile Kreativ</h3>
                {ad.mobile_image_url ? (
                  <img
                    src={ad.mobile_image_url}
                    alt={ad.alt_text || ad.campaign_name}
                    className="w-full h-auto rounded-lg border border-slate-200 object-contain"
                  />
                ) : (
                  <div className="w-full h-48 rounded-lg border-2 border-dashed border-slate-300 flex items-center justify-center text-slate-400">
                    Mobile kreativ yoxdur
                  </div>
                )}
              </div>
            </div>
          </div>

          {canManage && (
            <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
              <h2 className="mb-5 text-sm font-bold text-slate-900">Reklamı redaktə et</h2>
              <div className="space-y-4">
                <div className="grid gap-4 md:grid-cols-2">
                  <input
                    type="text"
                    placeholder="Kampaniya adı"
                    value={editForm.campaign_name ?? ""}
                    onChange={(e) => setEdit("campaign_name", e.target.value)}
                    className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm outline-none focus:border-[#2563EB]"
                  />
                  <input
                    type="text"
                    placeholder="Reklamverən adı"
                    value={editForm.advertiser_name ?? ""}
                    onChange={(e) => setEdit("advertiser_name", e.target.value)}
                    className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm outline-none focus:border-[#2563EB]"
                  />
                  <input
                    type="text"
                    placeholder="Sənaye"
                    value={editForm.industry ?? ""}
                    onChange={(e) => setEdit("industry", e.target.value)}
                    className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm outline-none focus:border-[#2563EB]"
                  />
                  <input
                    type="text"
                    placeholder="Başlıq"
                    value={editForm.headline ?? ""}
                    onChange={(e) => setEdit("headline", e.target.value)}
                    className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm outline-none focus:border-[#2563EB]"
                  />
                  <input
                    type="url"
                    placeholder="Hədəf URL"
                    value={editForm.destination_url ?? ""}
                    onChange={(e) => setEdit("destination_url", e.target.value)}
                    className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm outline-none focus:border-[#2563EB]"
                  />
                  <input
                    type="text"
                    placeholder="CTA etiketi"
                    value={editForm.cta_label ?? ""}
                    onChange={(e) => setEdit("cta_label", e.target.value)}
                    className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm outline-none focus:border-[#2563EB]"
                  />
                </div>
                <textarea
                  placeholder="Təsvir"
                  value={editForm.description ?? ""}
                  onChange={(e) => setEdit("description", e.target.value)}
                  rows={3}
                  className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm outline-none focus:border-[#2563EB]"
                />
                <div className="grid gap-4 md:grid-cols-2">
                  <select
                    value={editForm.placement ?? ""}
                    onChange={(e) => setEdit("placement", e.target.value)}
                    className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm outline-none focus:border-[#2563EB]"
                  >
                    <option value="TOP_LEADERBOARD">TOP_LEADERBOARD</option>
                    <option value="LEFT_SKIN">LEFT_SKIN</option>
                    <option value="RIGHT_SKIN">RIGHT_SKIN</option>
                    <option value="RIGHT_SIDEBAR">RIGHT_SIDEBAR</option>
                    <option value="INLINE_FEED">INLINE_FEED</option>
                    <option value="MOBILE_BANNER">MOBILE_BANNER</option>
                  </select>
                  <select
                    value={editForm.format ?? ""}
                    onChange={(e) => setEdit("format", e.target.value)}
                    className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm outline-none focus:border-[#2563EB]"
                  >
                    <option value="970x90">970x90</option>
                    <option value="160x600">160x600</option>
                    <option value="120x600">120x600</option>
                    <option value="300x250">300x250</option>
                    <option value="728x90">728x90</option>
                    <option value="320x100">320x100</option>
                    <option value="CUSTOM_SKIN">CUSTOM_SKIN</option>
                  </select>
                  <input
                    type="datetime-local"
                    placeholder="Başlama tarixi"
                    value={editForm.start_at ?? ""}
                    onChange={(e) => setEdit("start_at", e.target.value)}
                    className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm outline-none focus:border-[#2563EB]"
                  />
                  <input
                    type="datetime-local"
                    placeholder="Bitmə tarixi"
                    value={editForm.end_at ?? ""}
                    onChange={(e) => setEdit("end_at", e.target.value)}
                    className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm outline-none focus:border-[#2563EB]"
                  />
                  <input
                    type="number"
                    min="0"
                    placeholder="Prioritet"
                    value={editForm.priority ?? "0"}
                    onChange={(e) => setEdit("priority", e.target.value)}
                    className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm outline-none focus:border-[#2563EB]"
                  />
                  <select
                    value={editForm.background ?? "blue"}
                    onChange={(e) => setEdit("background", e.target.value)}
                    className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm outline-none focus:border-[#2563EB]"
                  >
                    <option value="blue">Blue</option>
                    <option value="navy">Navy</option>
                    <option value="teal">Teal</option>
                    <option value="slate">Slate</option>
                  </select>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <input
                    type="file"
                    accept="image/png,image/jpeg,image/webp"
                    onChange={(e) => {
                      const file = e.target.files?.[0]
                      if (file) handleCreativeUpload(file, false)
                    }}
                    disabled={uploadingCreative}
                    className="w-full md:w-auto rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs text-slate-600 file:mr-2 file:rounded-full file:border-0 file:bg-blue-50 file:px-3 file:py-1.5 file:text-xs file:font-semibold file:text-blue-700"
                  />
                  <span className="text-xs text-slate-400">Desktop kreativi yüklə</span>
                  <input
                    type="file"
                    accept="image/png,image/jpeg,image/webp"
                    onChange={(e) => {
                      const file = e.target.files?.[0]
                      if (file) handleCreativeUpload(file, true)
                    }}
                    disabled={uploadingCreative}
                    className="w-full md:w-auto rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs text-slate-600 file:mr-2 file:rounded-full file:border-0 file:bg-blue-50 file:px-3 file:py-1.5 file:text-xs file:font-semibold file:text-blue-700"
                  />
                  <span className="text-xs text-slate-400">Mobile kreativi yüklə</span>
                  {uploadingCreative && <Loader2 className="h-4 w-4 animate-spin text-[#2563EB]" />}
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={handleUpdate}
                    disabled={busy || uploadingCreative}
                    className="flex items-center justify-center gap-1.5 rounded-lg bg-[#2563EB] px-3 py-2.5 text-sm font-semibold text-white transition hover:bg-[#1D4ED8] disabled:opacity-50"
                  >
                    <Edit2 className="h-4 w-4" /> Yenilə
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>

        <div className="space-y-6">
          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <h2 className="mb-5 text-sm font-bold text-slate-900">Statistika</h2>
            <div className="grid grid-cols-3 gap-4">
              <div className="rounded-xl border border-slate-100 bg-slate-50/60 p-4 text-center">
                <div className="text-2xl font-bold text-slate-900">{ad.impressions}</div>
                <div className="text-xs text-slate-500">Baxışlar</div>
              </div>
              <div className="rounded-xl border border-slate-100 bg-slate-50/60 p-4 text-center">
                <div className="text-2xl font-bold text-slate-900">{ad.clicks}</div>
                <div className="text-xs text-slate-500">Kliklər</div>
              </div>
              <div className="rounded-xl border border-slate-100 bg-slate-50/60 p-4 text-center">
                <div className="text-2xl font-bold text-slate-900">{ad.impressions > 0 ? ((ad.clicks / ad.impressions) * 100).toFixed(2) : "0"}%</div>
                <div className="text-xs text-slate-500">CTR</div>
              </div>
            </div>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <h2 className="mb-4 text-sm font-bold text-slate-900">Moderasiya tarixçəsi</h2>
            {!ad.moderation_history || ad.moderation_history.length === 0 ? (
              <div className="py-4 text-center text-xs text-slate-400">Tarixçə yoxdur</div>
            ) : (
              <ol className="relative space-y-4 border-l border-slate-200 pl-4">
                {ad.moderation_history.map((h: any) => (
                  <li key={h.id} className="relative">
                    <span className="absolute -left-[21px] top-1.5 h-2.5 w-2.5 rounded-full border-2 border-white bg-[#2563EB]" />
                    <div className="text-xs font-semibold text-slate-800">
                      {h.from_status || "—"} → {h.to_status}
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

        {previewOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-6" onClick={() => setPreviewOpen(false)}>
          <div className="w-full max-w-4xl rounded-2xl bg-white shadow-xl" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between p-4 border-b border-slate-200">
              <h3 className="text-lg font-bold text-slate-900">Reklam önizləməsi</h3>
              <button
                onClick={() => setPreviewOpen(false)}
                className="rounded-lg p-2 text-slate-400 hover:bg-slate-100"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="p-4">
              <div className="aspect-video w-full rounded-lg bg-slate-100 flex items-center justify-center">
                {ad.creative_image_url ? (
                  <img src={ad.creative_image_url} alt={ad.alt_text || ad.campaign_name} className="max-w-full max-h-[60vh] object-contain" />
                ) : (
                  <div className="text-center text-slate-400">
                    <ImageIcon className="h-12 w-12 mx-auto mb-2 text-slate-300" />
                    <p>Kreativ yoxdur</p>
                  </div>
                )}
              </div>
              <div className="mt-4 text-center text-sm text-slate-500">
                {ad.headline || ad.campaign_name}
              </div>
            </div>
            <div className="p-4 border-t border-slate-200">
              <button
                onClick={() => setPreviewOpen(false)}
                className="w-full rounded-lg bg-[#2563EB] py-2.5 text-sm font-semibold text-white hover:bg-[#1D4ED8]"
              >
                Bağla
              </button>
            </div>
          </div>
        </div>
      )}
      </div>
    </div>
  )
}