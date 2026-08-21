"use client"

import { Suspense, useEffect, useState } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import Link from "next/link"
import {
  Building2,
  ShieldCheck,
  Clock,
  CheckCircle2,
  XCircle,
  Loader2,
  LogIn,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import {
  invitationApi,
  employerApi,
  type InvitationPreview,
  TEAM_ROLE_LABELS,
  INVITATION_STATUS_LABELS,
  EmployerApiError,
} from "@/lib/employer-api"

type ViewState =
  | "loading"
  | "preview"
  | "accepting"
  | "accepted"
  | "error"
  | "not_logged_in"

function InvitationAcceptContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const token = searchParams.get("token") || ""

  const [view, setView] = useState<ViewState>("loading")
  const [preview, setPreview] = useState<InvitationPreview | null>(null)
  const [errorMessage, setErrorMessage] = useState("")

  useEffect(() => {
    if (!token) {
      setView("error")
      setErrorMessage("Davet tokeni tapilmadi")
      return
    }

    let cancelled = false

    invitationApi
      .preview(token)
      .then((data) => {
        if (cancelled) return
        setPreview(data)

        if (data.status !== "PENDING") {
          setView("error")
          if (data.status === "EXPIRED") {
            setErrorMessage("Bu devetin muddeti bitib. Yeni devet teleb edin.")
          } else if (data.status === "ACCEPTED") {
            setErrorMessage("Bu devet artiq qebul edilib.")
          } else if (data.status === "REVOKED") {
            setErrorMessage("Bu devet legv edilib.")
          } else {
            setErrorMessage(
              "Devet statusu: " + (INVITATION_STATUS_LABELS[data.status] || data.status)
            )
          }
          return
        }

        employerApi
          .me()
          .then(() => {
            if (cancelled) return
            setView("preview")
          })
          .catch(() => {
            if (cancelled) return
            setView("not_logged_in")
          })
      })
      .catch((err) => {
        if (cancelled) return
        setView("error")
        if (err instanceof EmployerApiError) {
          if (err.status === 404) {
            setErrorMessage("Devet tapilmadi. Kecid linki duzgun deyil.")
          } else if (err.status === 410) {
            setErrorMessage("Bu devetin muddeti bitib.")
          } else {
            setErrorMessage(String(err.detail))
          }
        } else {
          setErrorMessage(err instanceof Error ? err.message : "Xeta bas verdi")
        }
      })

    return () => {
      cancelled = true
    }
  }, [token])

  const handleAccept = async () => {
    if (!token) return
    setView("accepting")
    try {
      await invitationApi.accept(token)
      setView("accepted")
      setTimeout(() => {
        router.push("/employer/team")
      }, 1500)
    } catch (err) {
      setView("error")
      if (err instanceof EmployerApiError) {
        if (err.status === 410) {
          setErrorMessage("Bu devetin muddeti bitib.")
        } else if (err.status === 409) {
          setErrorMessage("Bu devet artiq qebul edilib.")
        } else {
          setErrorMessage(String(err.detail))
        }
      } else {
        setErrorMessage(err instanceof Error ? err.message : "Qebul etmek mumkin olmad")
      }
    }
  }

  const handleLoginRedirect = () => {
    const returnTo = encodeURIComponent(
      "/employer/invitations/accept?token=" + token
    )
    router.push("/auth/login?redirect=" + returnTo)
  }

  if (view === "loading") {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#F2F6FD] p-6">
        <div className="w-full max-w-md space-y-4">
          <Skeleton className="h-64 w-full rounded-2xl" />
        </div>
      </div>
    )
  }

  if (view === "error") {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#F2F6FD] p-6">
        <Card className="w-full max-w-md">
          <CardContent className="flex flex-col items-center py-12 text-center">
            <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-red-100">
              <XCircle className="h-8 w-8 text-red-600" />
            </div>
            <h1 className="mb-2 text-lg font-bold text-slate-800">Xeta</h1>
            <p className="mb-6 text-sm text-slate-500">{errorMessage}</p>
            <Link href="/">
              <Button variant="outline">Ana sehife</Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    )
  }

  if (view === "accepted") {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#F2F6FD] p-6">
        <Card className="w-full max-w-md">
          <CardContent className="flex flex-col items-center py-12 text-center">
            <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-green-100">
              <CheckCircle2 className="h-8 w-8 text-green-600" />
            </div>
            <h1 className="mb-2 text-lg font-bold text-slate-800">
              Devet qebul edildi!
            </h1>
            <p className="mb-4 text-sm text-slate-500">
              Komandaya ugurla qoshuldunuz. Komanda sehifesine yonlendirilirsiniz...
            </p>
            <Loader2 className="h-5 w-5 animate-spin text-slate-400" />
          </CardContent>
        </Card>
      </div>
    )
  }

  if (view === "not_logged_in" && preview) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#F2F6FD] p-6">
        <Card className="w-full max-w-md">
          <CardContent className="py-8">
            <div className="mb-6 text-center">
              {preview.company_logo_url ? (
                <img
                  src={preview.company_logo_url}
                  alt={preview.company_name}
                  className="mx-auto mb-4 h-16 w-16 rounded-2xl object-cover"
                />
              ) : (
                <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-slate-100">
                  <Building2 className="h-8 w-8 text-slate-400" />
                </div>
              )}
              <h1 className="text-xl font-bold text-slate-800">
                {preview.company_name}
              </h1>
              <p className="mt-1 text-sm text-slate-500">
                sizi komandaya devet edir
              </p>
            </div>

            <div className="mb-6 space-y-3 rounded-xl border border-border bg-slate-50/80 p-4">
              <div className="flex items-center gap-3">
                <ShieldCheck className="h-4 w-4 text-slate-400" />
                <span className="text-sm text-slate-600">
                  Telif olunan rol:{" "}
                  <Badge variant="secondary">
                    {TEAM_ROLE_LABELS[preview.role] || preview.role}
                  </Badge>
                </span>
              </div>
              <div className="flex items-center gap-3">
                <Clock className="h-4 w-4 text-slate-400" />
                <span className="text-sm text-slate-600">
                  Muddet:{" "}
                  {new Date(preview.expires_at).toLocaleDateString("az-AZ", {
                    year: "numeric",
                    month: "long",
                    day: "numeric",
                  })}
                </span>
              </div>
            </div>

            <div className="space-y-3">
              <Button
                onClick={handleLoginRedirect}
                className="w-full"
                size="lg"
              >
                <LogIn className="mr-2 h-4 w-4" />
                Daxil ol ve qebul et
              </Button>
              <p className="text-center text-xs text-slate-400">
                Hesabiniz yoxdur?{" "}
                <Link
                  href={
                    "/auth/register?redirect=" +
                    encodeURIComponent(
                      "/employer/invitations/accept?token=" + token
                    )
                  }
                  className="text-brand-600 hover:underline"
                >
                  Qeydiyyatdan kecin
                </Link>
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  if (preview) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#F2F6FD] p-6">
        <Card className="w-full max-w-md">
          <CardContent className="py-8">
            <div className="mb-6 text-center">
              {preview.company_logo_url ? (
                <img
                  src={preview.company_logo_url}
                  alt={preview.company_name}
                  className="mx-auto mb-4 h-16 w-16 rounded-2xl object-cover"
                />
              ) : (
                <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-slate-100">
                  <Building2 className="h-8 w-8 text-slate-400" />
                </div>
              )}
              <h1 className="text-xl font-bold text-slate-800">
                {preview.company_name}
              </h1>
              <p className="mt-1 text-sm text-slate-500">
                sizi komandaya devet edir
              </p>
            </div>

            <div className="mb-6 space-y-3 rounded-xl border border-border bg-slate-50/80 p-4">
              <div className="flex items-center gap-3">
                <ShieldCheck className="h-4 w-4 text-slate-400" />
                <span className="text-sm text-slate-600">
                  Telif olunan rol:{" "}
                  <Badge variant="default">
                    {TEAM_ROLE_LABELS[preview.role] || preview.role}
                  </Badge>
                </span>
              </div>
              <div className="flex items-center gap-3">
                <Clock className="h-4 w-4 text-slate-400" />
                <span className="text-sm text-slate-600">
                  Muddet:{" "}
                  {new Date(preview.expires_at).toLocaleDateString("az-AZ", {
                    year: "numeric",
                    month: "long",
                    day: "numeric",
                  })}
                </span>
              </div>
            </div>

            <div className="space-y-3">
              <Button
                onClick={handleAccept}
                className="w-full"
                size="lg"
                disabled={view === "accepting"}
              >
                {view === "accepting" ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <CheckCircle2 className="mr-2 h-4 w-4" />
                )}
                Qebul et
              </Button>
              <div className="text-center">
                <Link
                  href="/"
                  className="text-xs text-slate-400 hover:text-slate-600 hover:underline"
                >
                  Redd et ve ana sehife
                </Link>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  return null
}

export default function InvitationAcceptPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center bg-[#F2F6FD] p-6">
          <div className="w-full max-w-md space-y-4">
            <Skeleton className="h-64 w-full rounded-2xl" />
          </div>
        </div>
      }
    >
      <InvitationAcceptContent />
    </Suspense>
  )
}
