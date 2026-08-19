"use client"

import { useCallback, useEffect, useState } from "react"
import Link from "next/link"
import { useSearchParams, useRouter } from "next/navigation"
import { adminApi, type AdminAdvertisement, type AdvertisementListResponse } from "@/lib/admin-api"
import { Search, Loader2, ChevronLeft, ChevronRight, Plus, Edit, Trash2, Check, X, Archive, Eye, Image, Upload, Clock, Calendar, Globe, MoreVertical, Play, Pause, RotateCcw } from "lucide-react"
import { cn } from "@/lib/utils"

const PAGE_SIZE = 15

const STATUS_LABELS: Record<string, string> = {
  ALL: "Hamısı",
  DRAFT: "Qaralama",
  SCHEDULED: "Planlaşdırılıb",
  ACTIVE: "Aktiv",
  PAUSED: "Dayandırılıb",
  EXPIRED: "Vaxtı bitib",
  ARCHIVED: "Arxivleşib",
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

export default function AdminAdsPage() {
  const searchParams = useSearchParams()
  const router = useRouter()

  const [q, setQ] = useState(searchParams.get("q") || "")
  const [placement, setPlacement] = useState(searchParams.get("placement") || "ALL")
  const [status, setStatus] = useState(searchParams.get("status") || "ALL")
  const [advertiser, setAdvertiser] = useState(searchParams.get("advertiser") || "")
  const [page, setPage] = useState(1)
  const [sort, setSort] = useState("created_desc")
  const [data, setData] = useState<AdvertisementListResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")

  const run = async (fn: () => Promise<any>) => {
    try {
      await fn()
      fetchList()
    } catch (err) {
      const detail = (err as any)?.detail
      alert(typeof detail === "string" ? detail : "Əməliyyat uğursuz oldu")
    }
  }

  const fetchList = useCallback(() => {
    setLoading(true)
    setError("")
    adminApi
      .listAds({
        q: q || undefined,
        placement: placement === "ALL" ? undefined : placement,
        status: status === "ALL" ? undefined : status,
        advertiser: advertiser || undefined,
        page,
        limit: PAGE_SIZE,
        sort,
      })
      .then(setData)
      .catch((err) => setError(String(err)))
      .finally(() => setLoading(false))
  }, [q, placement, status, advertiser, page, sort])

  useEffect(() => {
    fetchList()
  }, [fetchList])

  useEffect(() => {
    const params = new URLSearchParams()
    if (q) params.set("q", q)
    if (placement !== "ALL") params.set("placement", placement)
    if (status !== "ALL") params.set("status", status)
    if (advertiser) params.set("advertiser", advertiser)
    const qs = params.toString()
    router.replace(qs ? `/admin/ads?${qs}` : "/admin/ads", { scroll: false })
  }, [q, placement, status, advertiser, router])

  const totalPages = data?.total_pages || 1

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

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Reklamlar</h1>
          <p className="mt-1 text-sm text-slate-500">
            {data ? `Cəmi ${data.total} reklam` : "Yüklənir..."}
          </p>
        </div>
        <Link href="/admin/ads/new" className="flex items-center gap-1.5 rounded-lg bg-[#2563EB] px-4 py-2 text-sm font-semibold text-white transition hover:bg-[#1D4ED8]">
          <Plus className="h-4 w-4" /> Yeni reklam
        </Link>
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
            placeholder="Kampaniya, reklamverən, əlavə axtar..."
            className="w-full rounded-lg border border-slate-300 bg-white py-2 pl-10 pr-3 text-sm outline-none transition focus:border-[#2563EB] focus:ring-2 focus:ring-blue-100"
          />
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <select
            value={placement}
            onChange={(e) => {
              setPlacement(e.target.value)
              setPage(1)
            }}
            className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm outline-none focus:border-[#2563EB]"
          >
            <option value="ALL">Hamısı</option>
            <option value="TOP_LEADERBOARD">TOP_LEADERBOARD</option>
            <option value="LEFT_SKIN">LEFT_SKIN</option>
            <option value="RIGHT_SKIN">RIGHT_SKIN</option>
            <option value="RIGHT_SIDEBAR">RIGHT_SIDEBAR</option>
            <option value="INLINE_FEED">INLINE_FEED</option>
            <option value="MOBILE_BANNER">MOBILE_BANNER</option>
          </select>
          <select
            value={status}
            onChange={(e) => {
              setStatus(e.target.value)
              setPage(1)
            }}
            className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm outline-none focus:border-[#2563EB]"
          >
            <option value="ALL">Hamısı</option>
            <option value="DRAFT">Qaralama</option>
            <option value="SCHEDULED">Planlaşdırılıb</option>
            <option value="ACTIVE">Aktiv</option>
            <option value="PAUSED">Dayandırılıb</option>
            <option value="EXPIRED">Vaxtı bitib</option>
            <option value="ARCHIVED">Arxivleşib</option>
          </select>
          <select
            value={advertiser}
            onChange={(e) => {
              setAdvertiser(e.target.value)
              setPage(1)
            }}
            className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm outline-none focus:border-[#2563EB]"
          >
            <option value="ALL">Hamısı</option>
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
            <option value="priority_desc">Prioritet (yüksək)</option>
            <option value="start_desc">Başlama tarixi (yeni)</option>
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
                  <th className="px-6 py-3.5 font-semibold">Reklam</th>
                  <th className="px-4 py-3.5 font-semibold">Reklamverən</th>
                  <th className="px-4 py-3.5 font-semibold">Yerləşmə</th>
                  <th className="px-4 py-3.5 font-semibold">Format</th>
                  <th className="px-4 py-3.5 font-semibold">Status</th>
                  <th className="px-4 py-3.5 font-semibold">Başlama</th>
                  <th className="px-4 py-3.5 font-semibold">Bitmə</th>
                  <th className="px-4 py-3.5 font-semibold">Prioritet</th>
                  <th className="px-4 py-3.5 font-semibold">Baxış / Klik</th>
                  <th className="px-4 py-3.5 font-semibold">CTR</th>
                  <th className="px-6 py-3.5 text-right font-semibold">Əməliyyat</th>
                </tr>
              </thead>
              <tbody>
                {data.items.map((ad: any) => (
                  <tr key={ad.id} className="border-b border-slate-50 last:border-0 hover:bg-slate-50/60">
                    <td className="max-w-[280px] px-6 py-4">
                      <div className="truncate font-semibold text-slate-900">{ad.campaign_name}</div>
                      <div className="mt-0.5 text-xs text-slate-400">{ad.advertiser_name}</div>
                    </td>
                    <td className="px-4 py-4 text-slate-600">{ad.advertiser_name}</td>
                    <td className="px-4 py-4">
                      <span className={cn("rounded-full px-2.5 py-1 text-[11px] font-semibold whitespace-nowrap", "bg-blue-100 text-blue-700")}>
                        {PLACEMENT_LABELS[ad.placement] || ad.placement}
                      </span>
                    </td>
                    <td className="px-4 py-4">
                      <span className={cn("rounded-full px-2.5 py-1 text-[11px] font-semibold whitespace-nowrap", "bg-purple-100 text-purple-700")}>
                        {FORMAT_LABELS[ad.format] || ad.format}
                      </span>
                    </td>
                    <td className="px-4 py-4">
                      <span className={cn("rounded-full px-2.5 py-1 text-[11px] font-semibold whitespace-nowrap", STATUS_COLORS[ad.status] || "bg-slate-100 text-slate-600")}>
                        {STATUS_LABELS[ad.status] || ad.status}
                      </span>
                    </td>
                    <td className="px-4 py-4 text-slate-500">{fmtDate(ad.start_at)}</td>
                    <td className="px-4 py-4 text-slate-500">{fmtDate(ad.end_at)}</td>
                    <td className="px-4 py-4 text-slate-500">{ad.priority}</td>
                    <td className="px-4 py-4 text-slate-500">
                      <span className="inline-flex items-center gap-1">
                        <Eye className="h-3.5 w-3.5" /> {ad.impressions}
                      </span>
                      <span className="ml-3 text-slate-400">· {ad.clicks} klik</span>
                    </td>
                    <td className="px-4 py-4 text-slate-500">
                      {ad.impressions > 0 ? ((ad.clicks / ad.impressions) * 100).toFixed(2) + "%" : "0%"}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <Link href={`/admin/ads/${ad.id}`} className="text-xs font-semibold text-[#2563EB] hover:underline mr-2">
                        İdarə et
                      </Link>
                      <button
                        onClick={() => run(() => adminApi.changeAdStatus(ad.id, ad.status === "ACTIVE" ? "pause" : "activate"))}
                        className="text-xs font-semibold text-amber-600 hover:underline mr-2"
                      >
                        {ad.status === "ACTIVE" ? "Dayandır" : "Aktiv et"}
                      </button>
                      <button
                        onClick={() => run(() => adminApi.changeAdStatus(ad.id, "archive"))}
                        className="text-xs font-semibold text-slate-600 hover:underline mr-2"
                      >
                        Arxiv
                      </button>
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
              Səhifə {data.page} / {data.total_pages} · {data.total} nəticə
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
                onClick={() => setPage((p) => Math.min(data.total_pages, p + 1))}
                disabled={page >= data.total_pages}
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
