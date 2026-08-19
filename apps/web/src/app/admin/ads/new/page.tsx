"use client"

import { useCallback, useEffect, useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { adminApi, type AdminMe, type AdvertisementCreateRequest } from "@/lib/admin-api"
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
  Save,
  FileText,
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

export default function AdminAdCreatePage() {
  const router = useRouter()

  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")
  const [success, setSuccess] = useState(false)

  // Form state
  const [formData, setFormData] = useState({
    advertiser_name: "",
    campaign_name: "",
    industry: "",
    headline: "",
    description: "",
    cta_label: "",
    destination_url: "",
    alt_text: "",
    placement: "TOP_LEADERBOARD",
    format: "970x90",
    creative_image: null as File | null,
    mobile_image: null as File | null,
    background: "blue",
    accent_color: "#2563EB",
    start_at: "",
    end_at: "",
    priority: 0,
    status: "DRAFT",
  })

  const [desktopPreview, setDesktopPreview] = useState<string | null>(null)
  const [mobilePreview, setMobilePreview] = useState<string | null>(null)

  const [me, setMe] = useState<any | null>(null)

  const can = (perm: string) => me?.permissions?.includes(perm) ?? false

  useEffect(() => {
    adminApi.me().then(setMe).catch(() => setMe(null))
  }, [])

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const target = e.target as HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement
    const { name, value, type } = target
    const files = target instanceof HTMLInputElement ? target.files : undefined
    setFormData(prev => ({
      ...prev,
      [name]: type === "file" ? files?.[0] || null : value,
    }))
    if (name === "creative_image" && files?.[0]) {
      const reader = new FileReader()
      reader.onload = (e) => setDesktopPreview(e.target?.result as string)
      reader.readAsDataURL(files[0])
    }
    if (name === "mobile_image" && files?.[0]) {
      const reader = new FileReader()
      reader.onload = (e) => setMobilePreview(e.target?.result as string)
      reader.readAsDataURL(files[0])
    }
  }

  const handleSubmit = async (action: "draft" | "schedule" | "activate") => {
    if (!formData.advertiser_name || !formData.campaign_name || !formData.placement || !formData.format || !formData.destination_url) {
      setError("Bütün sahələr doldurulmalıdır")
      return
    }
    if (formData.destination_url && !formData.destination_url.startsWith("http")) {
      setError("Destination URL yalnız http:// və ya https:// olmalıdır")
      return
    }

    setLoading(true)
    setError("")

    try {
      let creative_image_url = ""
      if (formData.creative_image) {
        const up = await adminApi.uploadAdCreative(formData.creative_image, false)
        creative_image_url = up.url
      }
      let mobile_image_url = ""
      if (formData.mobile_image) {
        const up = await adminApi.uploadAdCreative(formData.mobile_image, true)
        mobile_image_url = up.url
      }

      let status = formData.status
      if (action === "schedule") status = "SCHEDULED"
      if (action === "activate") status = "ACTIVE"

      const payload: AdvertisementCreateRequest = {
        advertiser_name: formData.advertiser_name,
        campaign_name: formData.campaign_name,
        industry: formData.industry || undefined,
        headline: formData.headline || undefined,
        description: formData.description || undefined,
        cta_label: formData.cta_label || undefined,
        destination_url: formData.destination_url,
        alt_text: formData.alt_text || undefined,
        placement: formData.placement,
        format: formData.format,
        creative_image_url: creative_image_url || undefined,
        mobile_image_url: mobile_image_url || undefined,
        background: formData.background,
        accent_color: formData.accent_color,
        start_at: formData.start_at || undefined,
        end_at: formData.end_at || undefined,
        priority: Number(formData.priority) || 0,
        status,
      }

      const ad = await adminApi.createAd(payload)
      setSuccess(true)
      router.push(`/admin/ads/${ad.id}`)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Xəta baş verdi")
    } finally {
      setLoading(false)
    }
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>, field: "creative_image" | "mobile_image") => {
    const file = e.target.files?.[0]
    if (file) {
      setFormData(prev => ({ ...prev, [field]: file }))
      const reader = new FileReader()
      reader.onload = (e) => {
        if (field === "creative_image") setDesktopPreview(e.target?.result as string)
        else setMobilePreview(e.target?.result as string)
      }
      reader.readAsDataURL(file)
    }
  }

  return (
    <div className="space-y-6">
      <Link href="/admin/ads" className="inline-flex items-center gap-1.5 text-sm font-medium text-slate-500 hover:text-slate-800">
        <ArrowLeft className="h-4 w-4" /> Reklamlar
      </Link>

      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Yeni reklam</h1>
          <p className="mt-1 text-sm text-slate-500">Yeni reklam kampaniyası yaradın</p>
        </div>
      </div>

      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700" role="alert">
          {error}
        </div>
      )}

      {success && (
        <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-700" role="status">
          Reklam uğurla yaradıldı. Yönləndirilirsiniz...
        </div>
      )}

      <div className="rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="border-b border-slate-200 px-6 py-4">
          <h2 className="text-lg font-semibold text-slate-900">Əsas məlumatlar</h2>
        </div>
        <div className="p-6 space-y-6">
          <div className="grid gap-6 md:grid-cols-2">
            <div>
              <label className="mb-1.5 block text-sm font-medium text-slate-700">
                Reklamverən adı <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                name="advertiser_name"
                value={formData.advertiser_name}
                onChange={handleChange}
                placeholder="Məsələn: Kapital Bank"
                className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm outline-none focus:border-[#2563EB] focus:ring-2 focus:ring-blue-100"
                required
              />
            </div>
            <div>
              <label className="mb-1.5 block text-sm font-medium text-slate-700">
                Kampaniya adı <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                name="campaign_name"
                value={formData.campaign_name}
                onChange={handleChange}
                placeholder="Məsələn: 2026 Qış kampaniyası"
                className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm outline-none focus:border-[#2563EB] focus:ring-2 focus:ring-blue-100"
                required
              />
            </div>
            <div>
              <label className="mb-1.5 block text-sm font-medium text-slate-700">Sənaye</label>
              <input
                type="text"
                name="industry"
                value={formData.industry}
                onChange={handleChange}
                placeholder="Məsələn: Bankçılıq, Telekommunikasiya"
                className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm outline-none focus:border-[#2563EB] focus:ring-2 focus:ring-blue-100"
              />
            </div>
            <div>
              <label className="mb-1.5 block text-sm font-medium text-slate-700">Başlıq</label>
              <input
                type="text"
                name="headline"
                value={formData.headline}
                onChange={handleChange}
                placeholder="Məsələn: Kreditlərə xüsusi şərtlər"
                className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm outline-none focus:border-[#2563EB] focus:ring-2 focus:ring-blue-100"
              />
            </div>
            <div className="md:col-span-2">
              <label className="mb-1.5 block text-sm font-medium text-slate-700">Təsvir</label>
              <textarea
                name="description"
                value={formData.description}
                onChange={handleChange}
                rows={3}
                placeholder="Qısa təsvir..."
                className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm outline-none focus:border-[#2563EB] focus:ring-2 focus:ring-blue-100"
              />
            </div>
            <div>
              <label className="mb-1.5 block text-sm font-medium text-slate-700">CTA etiketi</label>
              <input
                type="text"
                name="cta_label"
                value={formData.cta_label}
                onChange={handleChange}
                placeholder="Məsələn: Müraciət et"
                className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm outline-none focus:border-[#2563EB] focus:ring-2 focus:ring-blue-100"
              />
            </div>
            <div className="md:col-span-2">
              <label className="mb-1.5 block text-sm font-medium text-slate-700">
                Hədəf URL <span className="text-red-500">*</span>
              </label>
              <input
                type="url"
                name="destination_url"
                value={formData.destination_url}
                onChange={handleChange}
                placeholder="https://example.com"
                className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm outline-none focus:border-[#2563EB] focus:ring-2 focus:ring-blue-100"
                required
              />
            </div>
            <div>
              <label className="mb-1.5 block text-sm font-medium text-slate-700">Alt mətn</label>
              <input
                type="text"
                name="alt_text"
                value={formData.alt_text}
                onChange={handleChange}
                placeholder="Reklam üçün alternativ mətn"
                className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm outline-none focus:border-[#2563EB] focus:ring-2 focus:ring-blue-100"
              />
            </div>
          </div>

          <div className="border-t border-slate-200 pt-6">
            <h3 className="mb-4 text-lg font-semibold text-slate-900">Yerləşmə və Format</h3>
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
              <div>
                <label className="mb-1.5 block text-sm font-medium text-slate-700">
                  Yerləşmə <span className="text-red-500">*</span>
                </label>
                <select
                  name="placement"
                  value={formData.placement}
                  onChange={handleChange}
                  className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm outline-none focus:border-[#2563EB] focus:ring-2 focus:ring-blue-100"
                  required
                >
                  <option value="TOP_LEADERBOARD">TOP_LEADERBOARD (Üst banner)</option>
                  <option value="LEFT_SKIN">LEFT_SKIN (Sol kenar)</option>
                  <option value="RIGHT_SKIN">RIGHT_SKIN (Sağ kenar)</option>
                  <option value="RIGHT_SIDEBAR">RIGHT_SIDEBAR (Sağ sidebar)</option>
                  <option value="INLINE_FEED">INLINE_FEED (Feed daxili)</option>
                  <option value="MOBILE_BANNER">MOBILE_BANNER (Mobil banner)</option>
                </select>
              </div>
              <div>
                <label className="mb-1.5 block text-sm font-medium text-slate-700">
                  Format <span className="text-red-500">*</span>
                </label>
                <select
                  name="format"
                  value={formData.format}
                  onChange={handleChange}
                  className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm outline-none focus:border-[#2563EB] focus:ring-2 focus:ring-blue-100"
                  required
                >
                  <option value="970x90">970x90</option>
                  <option value="160x600">160x600</option>
                  <option value="120x600">120x600</option>
                  <option value="300x250">300x250</option>
                  <option value="728x90">728x90</option>
                  <option value="320x100">320x100</option>
                  <option value="CUSTOM_SKIN">CUSTOM_SKIN</option>
                </select>
              </div>
              <div>
                <label className="mb-1.5 block text-sm font-medium text-slate-700">CTA etiketi</label>
                <input
                  type="text"
                  name="cta_label"
                  value={formData.cta_label}
                  onChange={handleChange}
                  placeholder="Məsələn: Müraciət et"
                  className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm outline-none focus:border-[#2563EB] focus:ring-2 focus:ring-blue-100"
                />
              </div>
              <div>
                <label className="mb-1.5 block text-sm font-medium text-slate-700">Hədəf URL <span className="text-red-500">*</span></label>
                <input
                  type="url"
                  name="destination_url"
                  value={formData.destination_url}
                  onChange={handleChange}
                  placeholder="https://example.com"
                  className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm outline-none focus:border-[#2563EB] focus:ring-2 focus:ring-blue-100"
                  required
                />
              </div>
            </div>
          </div>

          <div className="border-t border-slate-200 pt-6">
            <h3 className="mb-4 text-lg font-semibold text-slate-900">Kreativlər (Desktop və Mobile)</h3>
            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <label className="mb-1.5 block text-sm font-medium text-slate-700">
                  Desktop kreativ (Şəkil yükləyin)
                </label>
                <div className="relative">
                  <input
                    type="file"
                    name="creative_image"
                    onChange={(e) => handleFileChange(e, "creative_image")}
                    accept="image/png,image/jpeg,image/webp"
                    className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm outline-none focus:border-[#2563EB] focus:ring-2 focus:ring-blue-100 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700"
                  />
                  {desktopPreview && (
                    <div className="mt-2 relative w-full max-w-xs">
                      <img src={desktopPreview} alt="Desktop preview" className="w-full h-auto rounded-lg border border-slate-200" />
                    </div>
                  )}
                </div>
              </div>
              <div>
                <label className="mb-1.5 block text-sm font-medium text-slate-700">
                  Mobile kreativ (Şəkil yükləyin)
                </label>
                <div className="relative">
                  <input
                    type="file"
                    name="mobile_image"
                    onChange={(e) => handleFileChange(e, "mobile_image")}
                    accept="image/png,image/jpeg,image/webp"
                    className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm outline-none focus:border-[#2563EB] focus:ring-2 focus:ring-blue-100 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700"
                  />
                  {mobilePreview && (
                    <div className="mt-2 relative w-full max-w-xs">
                      <img src={mobilePreview} alt="Mobile preview" className="w-full h-auto rounded-lg border border-slate-200" />
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>

          <div className="border-t border-slate-200 pt-6">
            <h3 className="mb-4 text-lg font-semibold text-slate-900">Tarix və Status</h3>
            <div className="grid gap-4 md:grid-cols-3 lg:grid-cols-4">
              <div>
                <label className="mb-1.5 block text-sm font-medium text-slate-700">Başlama tarixi</label>
                <input
                  type="datetime-local"
                  name="start_at"
                  value={formData.start_at}
                  onChange={handleChange}
                  className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm outline-none focus:border-[#2563EB] focus:ring-2 focus:ring-blue-100"
                />
              </div>
              <div>
                <label className="mb-1.5 block text-sm font-medium text-slate-700">Bitmə tarixi</label>
                <input
                  type="datetime-local"
                  name="end_at"
                  value={formData.end_at}
                  onChange={handleChange}
                  className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm outline-none focus:border-[#2563EB] focus:ring-2 focus:ring-blue-100"
                />
              </div>
              <div>
                <label className="mb-1.5 block text-sm font-medium text-slate-700">Prioritet</label>
                <input
                  type="number"
                  min="0"
                  name="priority"
                  value={formData.priority}
                  onChange={handleChange}
                  className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm outline-none focus:border-[#2563EB] focus:ring-2 focus:ring-blue-100"
                />
              </div>
              <div>
                <label className="mb-1.5 block text-sm font-medium text-slate-700">Status <span className="text-red-500">*</span></label>
                <select
                  name="status"
                  value={formData.status}
                  onChange={handleChange}
                  className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm outline-none focus:border-[#2563EB] focus:ring-2 focus:ring-blue-100"
                  required
                >
                  <option value="DRAFT">Qaralama (Draft)</option>
                  <option value="SCHEDULED">Planlaşdırılıb (Scheduled)</option>
                  <option value="ACTIVE">Aktiv (Active)</option>
                  <option value="PAUSED">Dayandırılıb (Paused)</option>
                  <option value="EXPIRED">Vaxtı bitib (Expired)</option>
                  <option value="ARCHIVED">Arxivləşib (Archived)</option>
                </select>
              </div>
            </div>
          </div>

          <div className="border-t border-slate-200 pt-6">
            <h3 className="mb-4 text-lg font-semibold text-slate-900">Dizayn Parametrləri</h3>
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
              <div>
                <label className="mb-1.5 block text-sm font-medium text-slate-700">Background preset</label>
                <select
                  name="background"
                  value={formData.background}
                  onChange={handleChange}
                  className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm outline-none focus:border-[#2563EB] focus:ring-2 focus:ring-blue-100"
                >
                  <option value="blue">Blue</option>
                  <option value="navy">Navy</option>
                  <option value="teal">Teal</option>
                  <option value="slate">Slate</option>
                </select>
              </div>
              <div>
                <label className="mb-1.5 block text-sm font-medium text-slate-700">Accent color</label>
                <input
                  type="color"
                  name="accent_color"
                  value={formData.accent_color}
                  onChange={handleChange}
                  className="w-full h-10 rounded-lg border border-slate-300 bg-white cursor-pointer"
                />
              </div>
              <div>
                <label className="mb-1.5 block text-sm font-medium text-slate-700">Alt mətn</label>
                <input
                  type="text"
                  name="alt_text"
                  value={formData.alt_text}
                  onChange={handleChange}
                  placeholder="Reklam üçün alternativ mətn"
                  className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm outline-none focus:border-[#2563EB] focus:ring-2 focus:ring-blue-100"
                />
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="flex justify-end gap-3 pt-6 border-t border-slate-200">
        <Link
          href="/admin/ads"
          className="flex items-center justify-center gap-1.5 rounded-lg border border-slate-200 px-6 py-2.5 text-sm font-semibold text-slate-600 transition hover:bg-slate-50"
        >
          <ArrowLeft className="h-4 w-4" /> Geri
        </Link>
        <button
          type="button"
          onClick={() => handleSubmit("draft")}
          disabled={loading}
          className="flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-6 py-2.5 text-sm font-semibold text-slate-600 transition hover:bg-slate-50 disabled:opacity-50"
        >
          <FileText className="h-4 w-4" /> Qaralama kimi saxla
        </button>
        <button
          type="button"
          onClick={() => handleSubmit("schedule")}
          disabled={loading}
          className="flex items-center gap-1.5 rounded-lg border border-blue-200 bg-blue-50 px-6 py-2.5 text-sm font-semibold text-blue-600 transition hover:bg-blue-100 disabled:opacity-50"
        >
          <Clock className="h-4 w-4" /> Planlaşdır
        </button>
        <button
          type="submit"
          onClick={() => handleSubmit("activate")}
          disabled={loading}
          className="flex items-center gap-1.5 rounded-lg bg-[#2563EB] px-6 py-2.5 text-sm font-semibold text-white transition hover:bg-[#1D4ED8] disabled:opacity-50"
        >
          <Play className="h-4 w-4" /> Aktiv et
        </button>
      </div>
    </div>
  )
}

