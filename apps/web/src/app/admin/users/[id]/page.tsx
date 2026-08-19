"use client"

import { useCallback, useEffect, useState } from "react"
import Link from "next/link"
import { useParams, useRouter } from "next/navigation"
import { adminApi, type AdminMe, type UserDetailOut } from "@/lib/admin-api"
import {
  ArrowLeft,
  Loader2,
  ShieldCheck,
  BadgeCheck,
  BadgeX,
  UserX,
  RotateCcw,
  User,
  Mail,
  Calendar,
  AlertCircle,
  MoreVertical,
  LogOut,
} from "lucide-react"
import { cn } from "@/lib/utils"

const STATUS_LABELS: Record<string, string> = {
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

export default function AdminUserDetailPage() {
  const params = useParams<{ id: string }>()
  const router = useRouter()
  const id = params.id

  const [user, setUser] = useState<UserDetailOut | null>(null)
  const [me, setMe] = useState<AdminMe | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")
  const [busy, setBusy] = useState(false)

  const fetchUser = useCallback(() => {
    setLoading(true)
    setError("")
    adminApi
      .getUser(id)
      .then(setUser)
      .catch((err) => setError(String(err)))
      .finally(() => setLoading(false))
  }, [id])

  useEffect(() => {
    fetchUser()
  }, [fetchUser])

  useEffect(() => {
    adminApi
      .me()
      .then(setMe)
      .catch(() => setMe(null))
  }, [])

  const run = async (fn: () => Promise<UserDetailOut>) => {
    setBusy(true)
    try {
      const updated = await fn()
      setUser(updated)
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

  if (error || !user) {
    return <div className="rounded-xl border border-red-200 bg-red-50 p-6 text-sm text-red-700">Xəta: {error}</div>
  }

  const can = (perm: string) => me?.permissions?.includes(perm) ?? false
  const canManage = can("users.manage")

  return (
    <div className="space-y-6">
      <Link href="/admin/users" className="inline-flex items-center gap-1.5 text-sm font-medium text-slate-500 hover:text-slate-800">
        <ArrowLeft className="h-4 w-4" /> İstifadəçilər
      </Link>

      <div className="flex flex-col gap-4 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm md:flex-row md:items-start md:justify-between">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-slate-100 text-slate-600">
              <User className="h-6 w-6" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-slate-900">{user.full_name || user.email}</h1>
              <div className="text-sm text-slate-500">{user.email}</div>
            </div>
          </div>
          <div className="mt-3 flex flex-wrap items-center gap-x-5 gap-y-2 text-sm text-slate-500">
            <span className="inline-flex items-center gap-1.5">
              <User className="h-4 w-4 text-slate-400" /> {user.id}
            </span>
            <span className="inline-flex items-center gap-1.5">
              <Calendar className="h-4 w-4 text-slate-400" /> {fmtDate(user.created_at)}
            </span>
            <span className="inline-flex items-center gap-1.5">
              <Calendar className="h-4 w-4 text-slate-400" /> {fmtDate(user.last_login_at)}
            </span>
          </div>
          <div className="mt-4 flex flex-wrap items-center gap-2">
            <span className={cn("rounded-full px-3 py-1 text-xs font-semibold", ROLE_COLORS[user.role] || "bg-slate-100 text-slate-600")}>
              {user.role}
            </span>
            <span className={cn("rounded-full px-3 py-1 text-xs font-semibold", user.email_verified_at ? "bg-emerald-100 text-emerald-700" : "bg-slate-100 text-slate-600")}>
              {user.email_verified_at ? "Təsdiqlənib" : "Təsdiqlənməmiş"}
            </span>
            <span className={cn("rounded-full px-3 py-1 text-xs font-semibold", STATUS_COLORS[user.status] || "bg-slate-100 text-slate-600")}>
              {user.status}
            </span>
          </div>
        </div>

        <div className="flex shrink-0 flex-col gap-2 md:w-80">
          {canManage && (
            <div className="flex flex-wrap gap-2">
              {user.status === "ACTIVE" && (
                <button
                  onClick={() => run(() => adminApi.changeUserStatus(user.id, "suspend", "Admin tərəfindən dayandırılıb"))}
                  disabled={busy}
                  className="flex items-center justify-center gap-1.5 rounded-lg border border-orange-200 bg-orange-50 px-3 py-2.5 text-sm font-semibold text-orange-600 transition hover:bg-orange-100 disabled:opacity-50"
                >
                  <AlertCircle className="h-4 w-4" /> Dayandır
                </button>
              )}
              {user.status === "SUSPENDED" && (
                <button
                  onClick={() => run(() => adminApi.changeUserStatus(user.id, "unsuspend"))}
                  disabled={busy}
                  className="flex items-center justify-center gap-1.5 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2.5 text-sm font-semibold text-emerald-600 transition hover:bg-emerald-100 disabled:opacity-50"
                >
                  <RotateCcw className="h-4 w-4" /> Yenidən aktiv et
                </button>
              )}
              {user.status === "ACTIVE" || user.status === "SUSPENDED" ? (
                <button
                  onClick={() => {
                    if (confirm("İstifadəçini deaktiv etmək istəyirsiniz? Bu əməliyyat geri qaytarıla bilər.")) {
                      run(() => adminApi.changeUserStatus(user.id, "deactivate"))
                    }
                  }}
                  disabled={busy}
                  className="flex items-center justify-center gap-1.5 rounded-lg border border-red-200 bg-red-50 px-3 py-2.5 text-sm font-semibold text-red-600 transition hover:bg-red-100 disabled:opacity-50"
                >
                  <UserX className="h-4 w-4" /> Deaktiv et
                </button>
              ) : null}
              {user.status === "DELETED" && (
                <button
                  onClick={() => run(() => adminApi.changeUserStatus(user.id, "reactivate"))}
                  disabled={busy}
                  className="flex items-center justify-center gap-1.5 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2.5 text-sm font-semibold text-emerald-600 transition hover:bg-emerald-100 disabled:opacity-50"
                >
                  <RotateCcw className="h-4 w-4" /> Bərpa et
                </button>
              )}
              <button
                onClick={() => {
                  if (confirm("İstifadəçinin bütün sessiyalarını revoke etmək istəyirsiniz? Bu onları dərhal çıxış etdirməyə məcbur edəcək.")) {
                    run(() => adminApi.revokeUserSessions(user.id, "Admin tərəfindən revoke edildi"))
                  }
                }}
                disabled={busy}
                className="flex items-center justify-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm font-semibold text-slate-600 transition hover:bg-slate-50 disabled:opacity-50"
              >
                <LogOut className="h-4 w-4" /> Sessiyaları revoke et
              </button>
            </div>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <h2 className="mb-5 text-sm font-bold text-slate-900">Profil məlumatları</h2>
            <div className="space-y-4">
              <div className="flex flex-wrap gap-4">
                <div className="flex-1 min-w-[200px] rounded-xl border border-slate-100 bg-slate-50/60 p-4">
                  <div className="flex items-center gap-2 text-sm font-semibold text-slate-800">
                    <Mail className="h-4 w-4 text-slate-400" /> Email
                  </div>
                  <div className="mt-1 truncate text-sm text-slate-600">{user.email}</div>
                </div>
                <div className="flex-1 min-w-[200px] rounded-xl border border-slate-100 bg-slate-50/60 p-4">
                  <div className="flex items-center gap-2 text-sm font-semibold text-slate-800">
                    <User className="h-4 w-4 text-slate-400" /> Ad
                  </div>
                  <div className="mt-1 truncate text-sm text-slate-600">{user.full_name || "—"}</div>
                </div>
                <div className="flex-1 min-w-[200px] rounded-xl border border-slate-100 bg-slate-50/60 p-4">
                  <div className="flex items-center gap-2 text-sm font-semibold text-slate-800">
                    <Calendar className="h-4 w-4 text-slate-400" /> Yaradılma
                  </div>
                  <div className="mt-1 text-sm text-slate-600">{fmtDate(user.created_at)}</div>
                </div>
                <div className="flex-1 min-w-[200px] rounded-xl border border-slate-100 bg-slate-50/60 p-4">
                  <div className="flex items-center gap-2 text-sm font-semibold text-slate-800">
                    <Calendar className="h-4 w-4 text-slate-400" /> Son daxil olma
                  </div>
                  <div className="mt-1 text-sm text-slate-600">{fmtDate(user.last_login_at)}</div>
                </div>
                <div className="flex-1 min-w-[200px] rounded-xl border border-slate-100 bg-slate-50/60 p-4">
                  <div className="flex items-center gap-2 text-sm font-semibold text-slate-800">
                    <Calendar className="h-4 w-4 text-slate-400" /> Email təsdiqi
                  </div>
                  <div className="mt-1 text-sm text-slate-600">{user.email_verified_at ? fmtDate(user.email_verified_at) : "Təsdiqlənməmiş"}</div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="space-y-6">
          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <h2 className="mb-4 text-sm font-bold text-slate-900">Hesab statistikası</h2>
            <div className="grid grid-cols-2 gap-4">
              <div className="rounded-xl border border-slate-100 bg-slate-50/60 p-4 text-center">
                <div className="text-2xl font-bold text-slate-900">{user.active_sessions_count ?? 0}</div>
                <div className="text-xs text-slate-500">Aktiv sessiyalar</div>
              </div>
              <div className="rounded-xl border border-slate-100 bg-slate-50/60 p-4 text-center">
                <div className="text-2xl font-bold text-slate-900">{user.applications_count ?? 0}</div>
                <div className="text-xs text-slate-500">Müraciətlər</div>
              </div>
              <div className="rounded-xl border border-slate-100 bg-slate-50/60 p-4 text-center">
                <div className="text-2xl font-bold text-slate-900">{user.role}</div>
                <div className="text-xs text-slate-500">Rol</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

