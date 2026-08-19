"use client"

import { useCallback, useEffect, useState } from "react"
import Link from "next/link"
import { useParams, useRouter } from "next/navigation"
import { adminApi, type AdminCompany, type AdminMe, type CompanyDetailOut } from "@/lib/admin-api"
import {
  ArrowLeft,
  Loader2,
  ShieldCheck,
  BadgeCheck,
  BadgeX,
  Archive,
  RotateCcw,
  Eye,
  Building2,
  Star,
  MapPin,
  Calendar,
  Globe,
  Mail,
  Phone,
  Globe as GlobeIcon,
  Edit2,
  Trash2,
  Check,
  X,
  MoreVertical,
} from "lucide-react"
import { cn } from "@/lib/utils"

const STATUS_LABELS: Record<string, string> = {
  PENDING: "Gözləmədə",
  VERIFIED: "Təsdiqlənib",
  ACTIVE: "Aktiv",
  SUSPENDED: "Dayandırılıb",
  REJECTED: "Rədd edilib",
  ARCHIVED: "Arxivleşib",
}

const STATUS_COLORS: Record<string, string> = {
  PENDING: "bg-amber-100 text-amber-700",
  VERIFIED: "bg-emerald-100 text-emerald-700",
  ACTIVE: "bg-blue-100 text-blue-700",
  SUSPENDED: "bg-orange-100 text-orange-700",
  REJECTED: "bg-red-100 text-red-700",
  ARCHIVED: "bg-slate-100 text-slate-500",
}

function fmtDate(iso: string | null | undefined): string {
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

export default function AdminCompanyDetailPage() {
  const params = useParams<{ id: string }>()
  const router = useRouter()
  const id = params.id

  const [company, setCompany] = useState<CompanyDetailOut | null>(null)
  const [me, setMe] = useState<AdminMe | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")
  const [busy, setBusy] = useState(false)

  const [rejectOpen, setRejectOpen] = useState(false)
  const [rejectReason, setRejectReason] = useState("")
  const [rejectNote, setRejectNote] = useState("")

  const [featuredEnd, setFeaturedEnd] = useState(defaultEndDate(30))
  const [featuredPriority, setFeaturedPriority] = useState(0)

  const fetchCompany = useCallback(() => {
    setLoading(true)
    setError("")
    adminApi
      .getCompany(id)
      .then(setCompany)
      .catch((err) => setError(String(err)))
      .finally(() => setLoading(false))
  }, [id])

  useEffect(() => {
    fetchCompany()
  }, [fetchCompany])

  useEffect(() => {
    adminApi
      .me()
      .then(setMe)
      .catch(() => setMe(null))
  }, [])

  const run = async (fn: () => Promise<AdminCompany>) => {
    setBusy(true)
    try {
      const updated = await fn()
      setCompany(updated)
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

  if (error || !company) {
    return <div className="rounded-xl border border-red-200 bg-red-50 p-6 text-sm text-red-700">Xəta: {error}</div>
  }

  const can = (perm: string) => me?.permissions?.includes(perm) ?? false
  const canManage = can("companies.manage")
  const canVerify = can("companies.verify")

  return (
    <div className="space-y-6">
      <Link href="/admin/companies" className="inline-flex items-center gap-1.5 text-sm font-medium text-slate-500 hover:text-slate-800">
        <ArrowLeft className="h-4 w-4" /> Şirkətlər
      </Link>

      <div className="flex flex-col gap-4 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm md:flex-row md:items-start md:justify-between">
        <div>
          <div className="flex items-center gap-2.5">
            {company.logo_url ? (
              <img src={company.logo_url} alt="" className="h-10 w-10 rounded-lg object-cover border border-slate-200" />
            ) : (
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-slate-100 text-slate-400">
                <Building2 className="h-5 w-5" />
              </div>
            )}
            <h1 className="text-2xl font-bold text-slate-900">{company.name}</h1>
          </div>
          <div className="mt-3 flex flex-wrap items-center gap-x-5 gap-y-2 text-sm text-slate-500">
            <span className="inline-flex items-center gap-1.5">
              <Globe className="h-4 w-4 text-slate-400" /> {company.website || "—"}
            </span>
            <span className="inline-flex items-center gap-1.5">
              <Mail className="h-4 w-4 text-slate-400" /> {company.email || "—"}
            </span>
            <span className="inline-flex items-center gap-1.5">
              <Phone className="h-4 w-4 text-slate-400" /> {company.phone || "—"}
            </span>
            <span className="inline-flex items-center gap-1.5">
              <MapPin className="h-4 w-4 text-slate-400" /> {company.address || "—"}
            </span>
            <span className="inline-flex items-center gap-1.5">
              <Calendar className="h-4 w-4 text-slate-400" /> {fmtDate(company.created_at)}
            </span>
          </div>
          <div className="mt-4 flex flex-wrap items-center gap-2">
            <span className={cn("rounded-full px-3 py-1 text-xs font-semibold", STATUS_COLORS[company.status] || "bg-slate-100 text-slate-600")}>
              {company.status}
            </span>
            {company.verified_at && (
              <>
                <span className="rounded-full bg-emerald-100 px-3 py-1 text-xs font-semibold text-emerald-700">Təsdiqlənib</span>
                <span className="text-xs text-emerald-600">{fmtDate(company.verified_at)}</span>
              </>
            )}
            {company.featured_until && (
              <span className="rounded-full bg-amber-100 px-3 py-1 text-xs font-semibold text-amber-700">
                Özəl (bitmə: {new Date(company.featured_until).toLocaleDateString("az-AZ")})
              </span>
            )}
          </div>
        </div>

        <div className="flex shrink-0 flex-col gap-2 md:w-80">
          {canVerify && (
            <div className="flex gap-2">
              {company.status === "PENDING" && (
                <button
                  onClick={() => run(() => adminApi.changeCompanyStatus(company.id, "verify"))}
                  disabled={busy}
                  className="flex flex-1 items-center justify-center gap-1.5 rounded-lg bg-emerald-600 px-3 py-2.5 text-sm font-semibold text-white transition hover:bg-emerald-700 disabled:opacity-50"
                >
                  <ShieldCheck className="h-4 w-4" /> Təsdiqlə
                </button>
              )}
              {company.status === "VERIFIED" && (
                <button
                  onClick={() => run(() => adminApi.changeCompanyStatus(company.id, "unverify"))}
                  disabled={busy}
                  className="flex flex-1 items-center justify-center gap-1.5 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2.5 text-sm font-semibold text-amber-600 transition hover:bg-amber-100 disabled:opacity-50"
                >
                  <BadgeX className="h-4 w-4" /> Təsdiqi ləğv et
                </button>
              )}
              {company.status === "ACTIVE" && (
                <button
                  onClick={() => run(() => adminApi.changeCompanyStatus(company.id, "suspend"))}
                  disabled={busy}
                  className="flex flex-1 items-center justify-center gap-1.5 rounded-lg border border-orange-200 bg-orange-50 px-3 py-2.5 text-sm font-semibold text-orange-600 transition hover:bg-orange-100 disabled:opacity-50"
                >
                  <BadgeX className="h-4 w-4" /> Dayandır
                </button>
              )}
              {company.status === "SUSPENDED" && (
                <button
                  onClick={() => run(() => adminApi.changeCompanyStatus(company.id, "activate"))}
                  disabled={busy}
                  className="flex flex-1 items-center justify-center gap-1.5 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2.5 text-sm font-semibold text-emerald-600 transition hover:bg-emerald-100 disabled:opacity-50"
                >
                  <RotateCcw className="h-4 w-4" /> Yenidən aktiv et
                </button>
              )}
              {company.status === "VERIFIED" || company.status === "ACTIVE" ? (
                <button
                  onClick={() => setRejectOpen(true)}
                  disabled={busy}
                  className="flex flex-1 items-center justify-center gap-1.5 rounded-lg border border-red-200 bg-red-50 px-3 py-2.5 text-sm font-semibold text-red-600 transition hover:bg-red-100 disabled:opacity-50"
                >
                  <BadgeX className="h-4 w-4" /> Rədd et
                </button>
              ) : null}
              {company.status === "ARCHIVED" && (
                <button
                  onClick={() => run(() => adminApi.changeCompanyStatus(company.id, "restore"))}
                  disabled={busy}
                  className="flex flex-1 items-center justify-center gap-1.5 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2.5 text-sm font-semibold text-emerald-600 transition hover:bg-emerald-100 disabled:opacity-50"
                >
                  <RotateCcw className="h-4 w-4" /> Bərpa et
                </button>
              )}
              <button
                onClick={() => {
                  if (confirm("Şirkəti arxivləşdirmək istəyirsiniz? Bu əməliyyat geri qaytarıla bilər.")) {
                    run(() => adminApi.changeCompanyStatus(company.id, "archive"))
                  }
                }}
                disabled={busy}
                className="flex items-center justify-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm font-semibold text-slate-600 transition hover:bg-slate-50 disabled:opacity-50"
              >
                <Archive className="h-4 w-4" /> Arxivləşdir
              </button>
            </div>
          )}
          {company.featured_until ? (
            <button
              onClick={() => run(() => adminApi.setFeaturedEmployer(company.id, false))}
              disabled={busy}
              className="flex items-center justify-center gap-1.5 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2.5 text-sm font-semibold text-amber-600 transition hover:bg-amber-100 disabled:opacity-50"
            >
              <BadgeX className="h-4 w-4" /> Özel statusu ləğv et
            </button>
          ) : (
            <button
              onClick={() => run(() => adminApi.setFeaturedEmployer(company.id, true, new Date().toISOString(), `${featuredEnd}T00:00:00Z`, featuredPriority))}
              disabled={busy}
              className="flex items-center justify-center gap-1.5 rounded-lg bg-amber-500 px-3 py-2.5 text-sm font-semibold text-white transition hover:bg-amber-600 disabled:opacity-50"
            >
              <Star className="h-4 w-4" /> Özel et
            </button>
          )}
          {canManage && (
            <button
              onClick={() => {
                if (confirm("Şirkəti silmək istəyirsiniz? Bu əməliyyat geri qaytarıla bilməz.")) {
                  run(() => adminApi.updateCompany(company.id, { name: "", slug: "", description: "" })).catch(() => {})
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

      {company.verification_notes && (
        <div className="rounded-2xl border border-red-200 bg-red-50 p-5">
          <div className="text-sm font-bold text-red-700">Təsdiq qeydləri</div>
          <p className="mt-1 text-sm text-red-600">{company.verification_notes}</p>
        </div>
      )}

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <h2 className="mb-5 text-sm font-bold text-slate-900">Özəl işəgötürən parametrləri</h2>
            <div className="space-y-4">
              <div className="flex flex-wrap items-end justify-between gap-4 rounded-xl border border-slate-100 bg-slate-50/60 p-4">
                <div>
                  <div className="flex items-center gap-2 text-sm font-semibold text-slate-800">
                    <Star className="h-4 w-4 text-amber-500" />
                    Öncelik (priority)
                  </div>
                  <div className="mt-1 text-xs text-slate-500">
                    Yüksək prioritetli şirkətlər ilk göstərilir
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    min="0"
                    value={featuredPriority}
                    onChange={(e) => setFeaturedPriority(parseInt(e.target.value) || 0)}
                    className="w-24 rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs outline-none focus:border-[#2563EB]"
                  />
                  <button
                    onClick={() => run(() => adminApi.setFeaturedEmployer(company.id, true, new Date().toISOString(), `${featuredEnd}T00:00:00Z`, featuredPriority))}
                    disabled={busy}
                    className="rounded-lg px-4 py-2 text-xs font-semibold text-white transition disabled:opacity-50 bg-amber-500 hover:bg-amber-600"
                  >
                    Yenilə
                  </button>
                </div>

                <div className="flex flex-wrap items-end justify-between gap-4 rounded-xl border border-slate-100 bg-slate-50/60 p-4">
                  <div>
                    <div className="flex items-center gap-2 text-sm font-semibold text-slate-800">
                      <Star className="h-4 w-4 text-amber-500" />
                      Özel statusu
                    </div>
                    <div className="mt-1 text-xs text-slate-500">
                      {company.featured_until ? "Aktiv" : "Aktiv deyil"}
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
                      onClick={() => run(() => adminApi.setFeaturedEmployer(company.id, true, new Date().toISOString(), `${featuredEnd}T00:00:00Z`, featuredPriority))}
                      disabled={busy}
                      className="rounded-lg px-4 py-2 text-xs font-semibold text-white transition disabled:opacity-50 bg-amber-500 hover:bg-amber-600"
                    >
                      Aktivləşdir
                    </button>
                  </div>

                  {company.featured_until && (
                    <button
                      onClick={() => run(() => adminApi.setFeaturedEmployer(company.id, false))}
                      disabled={busy}
                      className="flex items-center justify-center gap-1.5 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2.5 text-sm font-semibold text-amber-600 transition hover:bg-amber-100 disabled:opacity-50"
                    >
                      <BadgeX className="h-4 w-4" /> Özel statusu ləğv et
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>

          {canManage && (
            <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
              <h2 className="mb-5 text-sm font-bold text-slate-900">Şirkət məlumatlarını redaktə et</h2>
              <div className="space-y-4">
                <input
                  type="text"
                  placeholder="Ad"
                  defaultValue={company.name}
                  className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm outline-none focus:border-[#2563EB]"
                />
                <input
                  type="text"
                  placeholder="Slug"
                  defaultValue={company.slug}
                  className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm outline-none focus:border-[#2563EB]"
                />
                <textarea
                  placeholder="Təsvir"
                  defaultValue={company.description || ""}
                  rows={3}
                  className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm outline-none focus:border-[#2563EB]"
                />
                <input
                  type="url"
                  placeholder="Veb sayt"
                  defaultValue={company.website || ""}
                  className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm outline-none focus:border-[#2563EB]"
                />
                <input
                  type="email"
                  placeholder="Email"
                  defaultValue={company.email || ""}
                  className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm outline-none focus:border-[#2563EB]"
                />
                <input
                  type="tel"
                  placeholder="Telefon"
                  defaultValue={company.phone || ""}
                  className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm outline-none focus:border-[#2563EB]"
                />
                <input
                  type="text"
                  placeholder="Ünvan"
                  defaultValue={company.address || ""}
                  className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm outline-none focus:border-[#2563EB]"
                />
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => run(() => adminApi.updateCompany(company.id, { name: (document.querySelector('input[placeholder="Ad"]') as HTMLInputElement)?.value })).catch(() => {})}
                    disabled={busy}
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
            <h2 className="mb-5 text-sm font-bold text-slate-900">İşəgötürən haqqinda</h2>
            <div className="space-y-4">
              <div className="flex flex-wrap gap-4">
                <div className="flex-1 min-w-[200px] rounded-xl border border-slate-100 bg-slate-50/60 p-4">
                  <div className="flex items-center gap-2 text-sm font-semibold text-slate-800">
                    <GlobeIcon className="h-4 w-4 text-slate-400" /> Veb sayt
                  </div>
                  <div className="mt-1 truncate text-sm text-slate-600">{company.website || "—"}</div>
                </div>
                <div className="flex-1 min-w-[200px] rounded-xl border border-slate-100 bg-slate-50/60 p-4">
                  <div className="flex items-center gap-2 text-sm font-semibold text-slate-800">
                    <Mail className="h-4 w-4 text-slate-400" /> Email
                  </div>
                  <div className="mt-1 truncate text-sm text-slate-600">{company.email || "—"}</div>
                </div>
                <div className="flex-1 min-w-[200px] rounded-xl border border-slate-100 bg-slate-50/60 p-4">
                  <div className="flex items-center gap-2 text-sm font-semibold text-slate-800">
                    <Phone className="h-4 w-4 text-slate-400" /> Telefon
                  </div>
                  <div className="mt-1 truncate text-sm text-slate-600">{company.phone || "—"}</div>
                </div>
                <div className="flex-1 min-w-[200px] rounded-xl border border-slate-100 bg-slate-50/60 p-4">
                  <div className="flex items-center gap-2 text-sm font-semibold text-slate-800">
                    <MapPin className="h-4 w-4 text-slate-400" /> Ünvan
                  </div>
                  <div className="mt-1 truncate text-sm text-slate-600">{company.address || "—"}</div>
                </div>
                <div className="flex-1 min-w-[200px] rounded-xl border border-slate-100 bg-slate-50/60 p-4">
                  <div className="flex items-center gap-2 text-sm font-semibold text-slate-800">
                    <Building2 className="h-4 w-4 text-slate-400" /> Sənaye
                  </div>
                  <div className="mt-1 truncate text-sm text-slate-600">{company.industry_name || company.industry || "—"}</div>
                </div>
              </div>
              {company.socials && Object.keys(company.socials).length > 0 && (
                <div className="mt-6">
                  <h3 className="mb-3 text-sm font-semibold text-slate-700">Sosial media</h3>
                  <div className="flex flex-wrap gap-2">
                    {Object.entries(company.socials).map(([platform, url]) => (
                      <a key={platform} href={String(url)} target="_blank" rel="noopener noreferrer" className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50">
                        {platform}: {String(url)}
                      </a>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <h2 className="mb-4 text-sm font-bold text-slate-900">Vakansiya statistikası</h2>
            <div className="grid grid-cols-2 gap-4">
              <div className="rounded-xl border border-slate-100 bg-slate-50/60 p-4 text-center">
                <div className="text-2xl font-bold text-slate-900">{company.active_jobs_count || 0}</div>
                <div className="text-xs text-slate-500">Aktiv vakansiyalar</div>
              </div>
              <div className="rounded-xl border border-slate-100 bg-slate-50/60 p-4 text-center">
                <div className="text-2xl font-bold text-slate-900">{company.total_jobs_count || 0}</div>
                <div className="text-xs text-slate-500">Cəmi vakansiyalar</div>
              </div>
            </div>
          </div>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="mb-4 text-sm font-bold text-slate-900">Moderasiya tarixçəsi</h2>
          {!company.moderation_history || company.moderation_history.length === 0 ? (
            <div className="py-4 text-center text-xs text-slate-400">Tarixçə yoxdur</div>
          ) : (
            <ol className="relative space-y-4 border-l border-slate-200 pl-4">
              {company.moderation_history.map((h) => (
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

      {rejectOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-6" onClick={() => setRejectOpen(false)}>
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-lg font-bold text-slate-900">Şirkəti rədd et</h3>
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
                onClick={() => run(() => adminApi.changeCompanyStatus(company.id, "reject", rejectReason.trim(), rejectNote.trim() || undefined))}
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