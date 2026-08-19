"use client"

import { useCallback, useEffect, useState } from "react"
import Link from "next/link"
import { useSearchParams, useRouter } from "next/navigation"
import { adminApi, type AdminUser, type UserListResponse } from "@/lib/admin-api"
import { Search, Loader2, ChevronLeft, ChevronRight, ShieldCheck, BadgeCheck, BadgeX, UserX, RotateCcw, User, Mail, Calendar, MoreVertical, AlertCircle } from "lucide-react"
import { cn } from "@/lib/utils"

const STATUS_LABELS: Record<string, string> = {
  ALL: "Hamısı",
  ACTIVE: "Aktiv",
  SUSPENDED: "Dayandırılıb",
  DELETED: "Silinib",
  PENDING_VERIFICATION: "Təsdiq gözləyir",
}

const STATUS_COLORS: Record<string, string> = {
  ACTIVE: "bg-emerald-100 text-emerald-700",
  SUSPENDED: "bg-orange-100 text-orange-700",
  DELETED: "bg-red-100 text-red-700",
  PENDING_VERIFICATION: "bg-amber-100 text-amber-700",
}

const ROLE_LABELS: Record<string, string> = {
  ALL: "Hamısı",
  SUPER_ADMIN: "Super Admin",
  ADMIN: "Admin",
  MODERATOR: "Moderator",
  CONTENT_MANAGER: "Content Manager",
  AD_MANAGER: "Ad Manager",
  SUPPORT: "Support",
  FINANCE_VIEWER: "Finance Viewer",
  USER: "User",
}

const ROLE_COLORS: Record<string, string> = {
  SUPER_ADMIN: "bg-purple-100 text-purple-700",
  ADMIN: "bg-blue-100 text-blue-700",
  MODERATOR: "bg-indigo-100 text-indigo-700",
  CONTENT_MANAGER: "bg-teal-100 text-teal-700",
  AD_MANAGER: "bg-amber-100 text-amber-700",
  SUPPORT: "bg-cyan-100 text-cyan-700",
  FINANCE_VIEWER: "bg-emerald-100 text-emerald-700",
  USER: "bg-slate-100 text-slate-600",
}

const PAGE_SIZE = 15

export default function AdminUsersPage() {
  const searchParams = useSearchParams()
  const router = useRouter()

  const [q, setQ] = useState(searchParams.get("q") || "")
  const [role, setRole] = useState(searchParams.get("role") || "ALL")
  const [status, setStatus] = useState(searchParams.get("status") || "ALL")
  const [emailVerified, setEmailVerified] = useState(searchParams.get("email_verified") || "ALL")
  const [page, setPage] = useState(1)
  const [sort, setSort] = useState("created_desc")
  const [data, setData] = useState<UserListResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")

  const fetchList = useCallback(() => {
    setLoading(true)
    setError("")
    adminApi
      .listUsers({
        q: q || undefined,
        role: role === "ALL" ? undefined : role,
        status: status === "ALL" ? undefined : status,
        email_verified: emailVerified === "true" ? true : emailVerified === "false" ? false : undefined,
        page,
        limit: PAGE_SIZE,
        sort,
      })
      .then(setData)
      .catch((err) => setError(String(err)))
      .finally(() => setLoading(false))
  }, [q, role, status, emailVerified, page, sort])

  useEffect(() => {
    fetchList()
  }, [fetchList])

  useEffect(() => {
    const params = new URLSearchParams()
    if (q) params.set("q", q)
    if (role !== "ALL") params.set("role", role)
    if (status !== "ALL") params.set("status", status)
    if (emailVerified !== "ALL") params.set("email_verified", emailVerified)
    const qs = params.toString()
    router.replace(qs ? `/admin/users?${qs}` : "/admin/users", { scroll: false })
  }, [q, role, status, emailVerified, router])

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
          <h1 className="text-2xl font-bold text-slate-900">İstifadəçilər</h1>
          <p className="mt-1 text-sm text-slate-500">
            {data ? `Cəmi ${data.total} istifadəçi` : "Yüklənir..."}
          </p>
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
            placeholder="Email, ad, ID üzrə axtar..."
            className="w-full rounded-lg border border-slate-300 bg-white py-2 pl-10 pr-3 text-sm outline-none transition focus:border-[#2563EB] focus:ring-2 focus:ring-blue-100"
          />
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <select
            value={role}
            onChange={(e) => {
              setRole(e.target.value)
              setPage(1)
            }}
            className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm outline-none focus:border-[#2563EB]"
          >
            {Object.entries(ROLE_LABELS).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
          <select
            value={status}
            onChange={(e) => {
              setStatus(e.target.value)
              setPage(1)
            }}
            className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm outline-none focus:border-[#2563EB]"
          >
            {Object.entries(STATUS_LABELS).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
          <select
            value={emailVerified}
            onChange={(e) => {
              setEmailVerified(e.target.value)
              setPage(1)
            }}
            className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm outline-none focus:border-[#2563EB]"
          >
            <option value="ALL">Hamısı</option>
            <option value="true">Təsdiqlənmiş</option>
            <option value="false">Təsdiqlənməmiş</option>
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
            <option value="email_asc">Email (A-Z)</option>
            <option value="last_login_desc">Son daxil olma</option>
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
                  <th className="px-6 py-3.5 font-semibold">İstifadəçi</th>
                  <th className="px-4 py-3.5 font-semibold">Rol</th>
                  <th className="px-4 py-3.5 font-semibold">Status</th>
                  <th className="px-4 py-3.5 font-semibold">Email təsdiqi</th>
                  <th className="px-4 py-3.5 font-semibold">Son daxil olma</th>
                  <th className="px-4 py-3.5 font-semibold">Yaradılma</th>
                  <th className="px-6 py-3.5 text-right font-semibold">Əməliyyat</th>
                </tr>
              </thead>
              <tbody>
                {data.items.map((user: AdminUser) => (
                  <tr key={user.id} className="border-b border-slate-50 last:border-0 hover:bg-slate-50/60">
                    <td className="max-w-[280px] px-6 py-4">
                      <div className="flex items-center gap-2">
                        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-slate-100 text-slate-600">
                          <User className="h-4 w-4" />
                        </div>
                        <div>
                          <div className="truncate font-semibold text-slate-900">{user.full_name || user.email}</div>
                          <div className="truncate text-xs text-slate-400">{user.email}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-4">
                      <span className={cn("rounded-full px-2.5 py-1 text-[11px] font-semibold whitespace-nowrap", ROLE_COLORS[user.role] || "bg-slate-100 text-slate-600")}>
                        {ROLE_LABELS[user.role] || user.role}
                      </span>
                    </td>
                    <td className="px-4 py-4">
                      <span className={cn("rounded-full px-2.5 py-1 text-[11px] font-semibold whitespace-nowrap", STATUS_COLORS[user.status] || "bg-slate-100 text-slate-600")}>
                        {STATUS_LABELS[user.status] || user.status}
                      </span>
                    </td>
                    <td className="px-4 py-4">
                      <span className={cn("rounded-full px-2.5 py-1 text-[11px] font-semibold whitespace-nowrap", user.email_verified_at ? "bg-emerald-100 text-emerald-700" : "bg-slate-100 text-slate-600")}>
                        {user.email_verified_at ? "Təsdiqlənib" : "Təsdiqlənməmiş"}
                      </span>
                    </td>
                    <td className="px-4 py-4 text-slate-500">{fmtDate(user.last_login_at)}</td>
                    <td className="px-4 py-4 text-slate-500">{fmtDate(user.created_at)}</td>
                    <td className="px-6 py-4 text-right">
                      <Link href={`/admin/users/${user.id}`} className="text-xs font-semibold text-[#2563EB] hover:underline">
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