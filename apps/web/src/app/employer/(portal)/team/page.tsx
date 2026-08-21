"use client"

import { useEffect, useState, useCallback } from "react"
import { useRouter } from "next/navigation"
import {
  Users,
  UserPlus,
  MoreHorizontal,
  Shield,
  Trash2,
  RefreshCw,
  X,
  Loader2,
  ArrowRightLeft,
} from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu"
import { cn } from "@/lib/utils"
import {
  employerTeamApi,
  type TeamMember,
  type TeamInvitation,
  TEAM_ROLE_LABELS,
  TEAM_STATUS_LABELS,
  INVITATION_STATUS_LABELS,
  EmployerApiError,
} from "@/lib/employer-api"

const ROLE_OPTIONS = ["ADMIN", "RECRUITER", "VIEWER"] as const

const ROLE_BADGE_VARIANT: Record<string, "default" | "secondary" | "outline" | "destructive"> = {
  OWNER: "default",
  ADMIN: "default",
  RECRUITER: "secondary",
  VIEWER: "outline",
}

const STATUS_BADGE_VARIANT: Record<string, "default" | "secondary" | "outline" | "destructive"> = {
  ACTIVE: "default",
  INVITED: "secondary",
  SUSPENDED: "destructive",
  PENDING: "secondary",
  ACCEPTED: "default",
  REVOKED: "destructive",
  EXPIRED: "outline",
}

export default function TeamPage() {
  const router = useRouter()

  const [members, setMembers] = useState<TeamMember[]>([])
  const [invitations, setInvitations] = useState<TeamInvitation[]>([])
  const [allInvitations, setAllInvitations] = useState<TeamInvitation[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const [inviteOpen, setInviteOpen] = useState(false)
  const [inviteEmail, setInviteEmail] = useState("")
  const [inviteRole, setInviteRole] = useState("VIEWER")
  const [inviteLoading, setInviteLoading] = useState(false)

  const [roleDialogMember, setRoleDialogMember] = useState<TeamMember | null>(null)
  const [newRole, setNewRole] = useState("")
  const [roleLoading, setRoleLoading] = useState(false)

  const [transferTargetId, setTransferTargetId] = useState("")
  const [transferLoading, setTransferLoading] = useState(false)

  const [actionLoading, setActionLoading] = useState<string | null>(null)
  const [invitationTab, setInvitationTab] = useState<"active" | "all">("active")

  const me = members.find((m) => m.role === "OWNER")

  const fetchData = useCallback(async () => {
    try {
      setError(null)
      const [membersRes, pendingRes, allRes] = await Promise.all([
        employerTeamApi.listMembers(),
        employerTeamApi.listInvitations("PENDING"),
        employerTeamApi.listInvitations(),
      ])
      setMembers(membersRes.items)
      setInvitations(pendingRes.items)
      setAllInvitations(allRes.items)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Məlumatları yükləmək mümkün olmadı")
    }
  }, [])

  useEffect(() => {
    setLoading(true)
    fetchData().finally(() => setLoading(false))
  }, [fetchData])

  const handleInvite = async (e: React.FormEvent) => {
    e.preventDefault()
    setInviteLoading(true)
    try {
      await employerTeamApi.inviteMember(inviteEmail.trim(), inviteRole)
      setInviteOpen(false)
      setInviteEmail("")
      setInviteRole("VIEWER")
      await fetchData()
    } catch (err) {
      const msg = err instanceof EmployerApiError ? String(err.detail) : err instanceof Error ? err.message : "Xəta baş verdi"
      setError(msg)
    } finally {
      setInviteLoading(false)
    }
  }

  const handleChangeRole = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!roleDialogMember || !newRole) return
    setRoleLoading(true)
    try {
      await employerTeamApi.changeRole(roleDialogMember.id, newRole)
      setRoleDialogMember(null)
      setNewRole("")
      await fetchData()
    } catch (err) {
      const msg = err instanceof EmployerApiError ? String(err.detail) : err instanceof Error ? err.message : "Xəta baş verdi"
      setError(msg)
    } finally {
      setRoleLoading(false)
    }
  }

  const handleSuspend = async (memberId: string) => {
    setActionLoading(memberId)
    try {
      await employerTeamApi.suspend(memberId)
      await fetchData()
    } catch (err) {
      const msg = err instanceof EmployerApiError ? String(err.detail) : err instanceof Error ? err.message : "Xəta baş verdi"
      setError(msg)
    } finally {
      setActionLoading(null)
    }
  }

  const handleReactivate = async (memberId: string) => {
    setActionLoading(memberId)
    try {
      await employerTeamApi.reactivate(memberId)
      await fetchData()
    } catch (err) {
      const msg = err instanceof EmployerApiError ? String(err.detail) : err instanceof Error ? err.message : "Xəta baş verdi"
      setError(msg)
    } finally {
      setActionLoading(null)
    }
  }

  const handleRemove = async (memberId: string) => {
    if (!confirm("Bu üzvü silmək istədiyinizə əminsiniz?")) return
    setActionLoading(memberId)
    try {
      await employerTeamApi.remove(memberId)
      await fetchData()
    } catch (err) {
      const msg = err instanceof EmployerApiError ? String(err.detail) : err instanceof Error ? err.message : "Xəta baş verdi"
      setError(msg)
    } finally {
      setActionLoading(null)
    }
  }

  const handleResend = async (invitationId: string) => {
    setActionLoading(invitationId)
    try {
      await employerTeamApi.resendInvitation(invitationId)
      await fetchData()
    } catch (err) {
      const msg = err instanceof EmployerApiError ? String(err.detail) : err instanceof Error ? err.message : "Xəta baş verdi"
      setError(msg)
    } finally {
      setActionLoading(null)
    }
  }

  const handleRevoke = async (invitationId: string) => {
    if (!confirm("Bu dəvəti ləğv etmək istədiyinizə əminsiniz?")) return
    setActionLoading(invitationId)
    try {
      await employerTeamApi.revokeInvitation(invitationId)
      await fetchData()
    } catch (err) {
      const msg = err instanceof EmployerApiError ? String(err.detail) : err instanceof Error ? err.message : "Xəta baş verdi"
      setError(msg)
    } finally {
      setActionLoading(null)
    }
  }

  const handleLeave = async () => {
    if (!confirm("Şirkətdən ayrılmq istədiyinizə əminsiniz?")) return
    try {
      await employerTeamApi.leave()
      router.replace("/")
    } catch (err) {
      const msg = err instanceof EmployerApiError ? String(err.detail) : err instanceof Error ? err.message : "Xəta baş verdi"
      setError(msg)
    }
  }

  const handleTransferOwnership = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!transferTargetId) return
    if (!confirm("Sahiblik hüququnu transfer etmək istədiyinizə əminsiniz? Bu əməliyyat geri alıla bilməz.")) return
    setTransferLoading(true)
    try {
      await employerTeamApi.transferOwnership(transferTargetId)
      setTransferTargetId("")
      await fetchData()
    } catch (err) {
      const msg = err instanceof EmployerApiError ? String(err.detail) : err instanceof Error ? err.message : "Xəta baş verdi"
      setError(msg)
    } finally {
      setTransferLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-9 w-56" />
        <Skeleton className="h-64 w-full" />
        <Skeleton className="h-48 w-full" />
      </div>
    )
  }

  const nonOwnerMembers = members.filter((m) => m.role !== "OWNER" && m.status === "ACTIVE")

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Komanda</h1>
          <p className="mt-1 text-sm text-slate-500">
            Komanda üzvlərini və dəvətləri idarə edin
          </p>
        </div>
        <Button onClick={() => setInviteOpen(true)}>
          <UserPlus className="mr-2 h-4 w-4" />
          Üzv dəvət et
        </Button>
      </div>

      {error && (
        <div className="flex items-center justify-between rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          <span>{error}</span>
          <button onClick={() => setError(null)} className="text-red-400 hover:text-red-600">
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      {/* Members Table */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">
            <Users className="mr-2 inline h-4 w-4" />
            Üzvlər ({members.length})
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-border bg-slate-50/80">
                  <th className="px-4 py-3 font-medium text-slate-600">Ad</th>
                  <th className="px-4 py-3 font-medium text-slate-600">E-poçt</th>
                  <th className="px-4 py-3 font-medium text-slate-600">Rol</th>
                  <th className="px-4 py-3 font-medium text-slate-600">Status</th>
                  <th className="px-4 py-3 text-right font-medium text-slate-600">Əməliyyatlar</th>
                </tr>
              </thead>
              <tbody>
                {members.map((member) => (
                  <tr key={member.id} className="border-b border-border last:border-0">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-slate-100 text-[13px] font-bold text-slate-500">
                          {(member.user_full_name || member.user_email || "?")[0]?.toUpperCase()}
                        </span>
                        <span className="font-medium text-slate-800">
                          {member.user_full_name || "—"}
                        </span>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-slate-500">{member.user_email || "—"}</td>
                    <td className="px-4 py-3">
                      <Badge variant={ROLE_BADGE_VARIANT[member.role] || "secondary"}>
                        {TEAM_ROLE_LABELS[member.role] || member.role}
                      </Badge>
                    </td>
                    <td className="px-4 py-3">
                      <Badge variant={STATUS_BADGE_VARIANT[member.status] || "secondary"}>
                        {TEAM_STATUS_LABELS[member.status] || member.status}
                      </Badge>
                    </td>
                    <td className="px-4 py-3 text-right">
                      {member.role === "OWNER" ? (
                        <span className="text-xs text-slate-400">—</span>
                      ) : (
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button
                              variant="ghost"
                              size="sm"
                              disabled={actionLoading === member.id}
                            >
                              {actionLoading === member.id ? (
                                <Loader2 className="h-4 w-4 animate-spin" />
                              ) : (
                                <MoreHorizontal className="h-4 w-4" />
                              )}
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem
                              onClick={() => {
                                setRoleDialogMember(member)
                                setNewRole(member.role)
                              }}
                            >
                              <Shield className="mr-2 h-4 w-4" />
                              Rolu dəyiş
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            {member.status === "ACTIVE" ? (
                              <DropdownMenuItem
                                onClick={() => handleSuspend(member.id)}
                                className="text-amber-600"
                              >
                                Dayandır
                              </DropdownMenuItem>
                            ) : (
                              <DropdownMenuItem onClick={() => handleReactivate(member.id)}>
                                Aktivləşdir
                              </DropdownMenuItem>
                            )}
                            <DropdownMenuSeparator />
                            <DropdownMenuItem
                              onClick={() => handleRemove(member.id)}
                              className="text-red-600"
                            >
                              <Trash2 className="mr-2 h-4 w-4" />
                              Sil
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Invitations */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Dəvətlər</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex gap-1 rounded-lg border border-border bg-slate-50/80 p-1 mb-4">
            <button
              onClick={() => setInvitationTab("active")}
              className={cn(
                "flex-1 rounded-md px-3 py-2 text-sm font-medium transition-colors",
                invitationTab === "active"
                  ? "bg-white text-slate-800 shadow-sm"
                  : "text-slate-500 hover:text-slate-700"
              )}
            >
              Aktiv dəvətlər ({invitations.length})
            </button>
            <button
              onClick={() => setInvitationTab("all")}
              className={cn(
                "flex-1 rounded-md px-3 py-2 text-sm font-medium transition-colors",
                invitationTab === "all"
                  ? "bg-white text-slate-800 shadow-sm"
                  : "text-slate-500 hover:text-slate-700"
              )}
            >
              Bütün dəvətlər ({allInvitations.length})
            </button>
          </div>

          {invitationTab === "active" && (
            <>
              {invitations.length === 0 ? (
                <p className="py-8 text-center text-sm text-slate-500">
                  Aktiv dəvət yoxdur
                </p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-sm">
                    <thead>
                      <tr className="border-b border-border bg-slate-50/80">
                        <th className="px-4 py-3 font-medium text-slate-600">E-poçt</th>
                        <th className="px-4 py-3 font-medium text-slate-600">Rol</th>
                        <th className="px-4 py-3 font-medium text-slate-600">Status</th>
                        <th className="px-4 py-3 font-medium text-slate-600">Vaxt</th>
                        <th className="px-4 py-3 text-right font-medium text-slate-600">Əməliyyatlar</th>
                      </tr>
                    </thead>
                    <tbody>
                      {invitations.map((inv) => (
                        <tr key={inv.id} className="border-b border-border last:border-0">
                          <td className="px-4 py-3 text-slate-800">{inv.email}</td>
                          <td className="px-4 py-3">
                            <Badge variant={ROLE_BADGE_VARIANT[inv.role] || "secondary"}>
                              {TEAM_ROLE_LABELS[inv.role] || inv.role}
                            </Badge>
                          </td>
                          <td className="px-4 py-3">
                            <Badge variant={STATUS_BADGE_VARIANT[inv.status] || "secondary"}>
                              {INVITATION_STATUS_LABELS[inv.status] || inv.status}
                            </Badge>
                          </td>
                          <td className="px-4 py-3 text-xs text-slate-500">
                            {inv.created_at
                              ? new Date(inv.created_at).toLocaleString("az-AZ")
                              : "—"}
                          </td>
                          <td className="px-4 py-3 text-right">
                            <div className="flex items-center justify-end gap-1">
                              <Button
                                variant="ghost"
                                size="sm"
                                disabled={actionLoading === inv.id}
                                onClick={() => handleResend(inv.id)}
                              >
                                <RefreshCw className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                disabled={actionLoading === inv.id}
                                onClick={() => handleRevoke(inv.id)}
                                className="text-red-600 hover:text-red-700"
                              >
                                <X className="h-4 w-4" />
                              </Button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </>
          )}

          {invitationTab === "all" && (
            <>
              {allInvitations.length === 0 ? (
                <p className="py-8 text-center text-sm text-slate-500">
                  Heç bir dəvət yoxdur
                </p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-sm">
                    <thead>
                      <tr className="border-b border-border bg-slate-50/80">
                        <th className="px-4 py-3 font-medium text-slate-600">E-poçt</th>
                        <th className="px-4 py-3 font-medium text-slate-600">Rol</th>
                        <th className="px-4 py-3 font-medium text-slate-600">Status</th>
                        <th className="px-4 py-3 font-medium text-slate-600">Dəvət edən</th>
                        <th className="px-4 py-3 font-medium text-slate-600">Vaxt</th>
                        <th className="px-4 py-3 text-right font-medium text-slate-600">Əməliyyatlar</th>
                      </tr>
                    </thead>
                    <tbody>
                      {allInvitations.map((inv) => (
                        <tr key={inv.id} className="border-b border-border last:border-0">
                          <td className="px-4 py-3 text-slate-800">{inv.email}</td>
                          <td className="px-4 py-3">
                            <Badge variant={ROLE_BADGE_VARIANT[inv.role] || "secondary"}>
                              {TEAM_ROLE_LABELS[inv.role] || inv.role}
                            </Badge>
                          </td>
                          <td className="px-4 py-3">
                            <Badge variant={STATUS_BADGE_VARIANT[inv.status] || "secondary"}>
                              {INVITATION_STATUS_LABELS[inv.status] || inv.status}
                            </Badge>
                          </td>
                          <td className="px-4 py-3 text-xs text-slate-500">
                            {inv.invited_by || "—"}
                          </td>
                          <td className="px-4 py-3 text-xs text-slate-500">
                            {inv.created_at
                              ? new Date(inv.created_at).toLocaleString("az-AZ")
                              : "—"}
                          </td>
                          <td className="px-4 py-3 text-right">
                            {inv.status === "PENDING" ? (
                              <div className="flex items-center justify-end gap-1">
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  disabled={actionLoading === inv.id}
                                  onClick={() => handleResend(inv.id)}
                                >
                                  <RefreshCw className="h-4 w-4" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  disabled={actionLoading === inv.id}
                                  onClick={() => handleRevoke(inv.id)}
                                  className="text-red-600 hover:text-red-700"
                                >
                                  <X className="h-4 w-4" />
                                </Button>
                              </div>
                            ) : (
                              <span className="text-xs text-slate-400">—</span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>

      {/* Transfer Ownership - OWNER only */}
      {me && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">
              <ArrowRightLeft className="mr-2 inline h-4 w-4" />
              Sahiblik hüququnu transfer et
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="mb-4 text-sm text-slate-500">
              Şirkətin sahiblik hüququnu digər üzvə verin. Bu əməliyyat geri alıla bilməz.
            </p>
            <form onSubmit={handleTransferOwnership} className="flex items-end gap-3">
              <div className="flex-1">
                <Select value={transferTargetId} onValueChange={setTransferTargetId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Üzv seçin" />
                  </SelectTrigger>
                  <SelectContent>
                    {nonOwnerMembers.map((m) => (
                      <SelectItem key={m.id} value={m.id}>
                        {m.user_full_name || m.user_email}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <Button
                type="submit"
                variant="destructive"
                disabled={!transferTargetId || transferLoading}
              >
                {transferLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Transfer et
              </Button>
            </form>
          </CardContent>
        </Card>
      )}

      {/* Leave Company */}
      {me && me.role !== "OWNER" && (
        <Card className="border-red-200">
          <CardContent className="py-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium text-slate-800">Şirkətdən ayrıl</p>
                <p className="text-sm text-slate-500">
                  Bu şirkətin komandasından çıxacaqsınız
                </p>
              </div>
              <Button variant="destructive" onClick={handleLeave}>
                Şirkətdən ayrıl
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Invite Dialog */}
      {inviteOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div
            className="fixed inset-0 bg-black/50 backdrop-blur-sm"
            onClick={() => !inviteLoading && setInviteOpen(false)}
          />
          <div className="relative z-10 w-full max-w-md rounded-2xl border border-border bg-white p-6 shadow-xl">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-lg font-bold text-slate-800">Üzv dəvət et</h2>
              <button
                onClick={() => !inviteLoading && setInviteOpen(false)}
                className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <form onSubmit={handleInvite} className="space-y-4">
              <div>
                <label className="mb-1.5 block text-sm font-medium text-slate-700">
                  E-poçt ünvanı
                </label>
                <Input
                  type="email"
                  value={inviteEmail}
                  onChange={(e) => setInviteEmail(e.target.value)}
                  placeholder="ornek@simail.az"
                  required
                  disabled={inviteLoading}
                />
              </div>
              <div>
                <label className="mb-1.5 block text-sm font-medium text-slate-700">Rol</label>
                <Select value={inviteRole} onValueChange={setInviteRole} disabled={inviteLoading}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {ROLE_OPTIONS.map((role) => (
                      <SelectItem key={role} value={role}>
                        {TEAM_ROLE_LABELS[role]}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setInviteOpen(false)}
                  disabled={inviteLoading}
                >
                  Ləğv et
                </Button>
                <Button type="submit" disabled={inviteLoading || !inviteEmail.trim()}>
                  {inviteLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Dəvət et
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Change Role Dialog */}
      {roleDialogMember && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div
            className="fixed inset-0 bg-black/50 backdrop-blur-sm"
            onClick={() => !roleLoading && setRoleDialogMember(null)}
          />
          <div className="relative z-10 w-full max-w-md rounded-2xl border border-border bg-white p-6 shadow-xl">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-lg font-bold text-slate-800">Rolu dəyiş</h2>
              <button
                onClick={() => !roleLoading && setRoleDialogMember(null)}
                className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <form onSubmit={handleChangeRole} className="space-y-4">
              <div>
                <p className="text-sm text-slate-500">
                  <span className="font-medium text-slate-800">
                    {roleDialogMember.user_full_name || roleDialogMember.user_email}
                  </span>{" "}
                  üçün yeni rolu seçin
                </p>
                <div className="mt-2">
                  <Badge variant={ROLE_BADGE_VARIANT[roleDialogMember.role] || "secondary"}>
                    Cari rol: {TEAM_ROLE_LABELS[roleDialogMember.role]}
                  </Badge>
                </div>
              </div>
              <div>
                <label className="mb-1.5 block text-sm font-medium text-slate-700">Yeni rol</label>
                <Select value={newRole} onValueChange={setNewRole} disabled={roleLoading}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {ROLE_OPTIONS.map((role) => (
                      <SelectItem key={role} value={role}>
                        {TEAM_ROLE_LABELS[role]}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setRoleDialogMember(null)}
                  disabled={roleLoading}
                >
                  Ləğv et
                </Button>
                <Button type="submit" disabled={roleLoading || !newRole || newRole === roleDialogMember.role}>
                  {roleLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Dəyişdir
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
