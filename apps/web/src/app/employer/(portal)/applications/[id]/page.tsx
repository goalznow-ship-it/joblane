"use client"

import { useCallback, useEffect, useState } from "react"
import { useParams, useRouter } from "next/navigation"
import Link from "next/link"
import { ArrowLeft, Mail, Check, X, UserCheck, CalendarClock, Briefcase } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import {
  employerApi,
  type EmployerApplication,
  APPLICATION_STATUS_LABELS,
} from "@/lib/employer-api"

const PIPELINE: { status: string; label: string; icon: typeof Check }[] = [
  { status: "SUBMITTED", label: "Yeni", icon: Check },
  { status: "VIEWED", label: "Baxıldı", icon: Check },
  { status: "SHORTLISTED", label: "Siyahıda", icon: UserCheck },
  { status: "INTERVIEW", label: "Müsahibə", icon: CalendarClock },
  { status: "HIRED", label: "İşə götürüldü", icon: Briefcase },
]

const STATUS_VARIANTS: Record<string, "default" | "secondary" | "outline" | "destructive"> = {
  SUBMITTED: "default",
  VIEWED: "secondary",
  SHORTLISTED: "secondary",
  INTERVIEW: "default",
  REJECTED: "destructive",
  HIRED: "default",
  WITHDRAWN: "outline",
}

export default function ApplicationDetailPage() {
  const params = useParams<{ id: string }>()
  const router = useRouter()
  const [app, setApp] = useState<EmployerApplication | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  const reload = useCallback(() => {
    employerApi
      .getApplication(params.id)
      .then(setApp)
      .catch((err) => setError(err instanceof Error ? err.message : "Xəta"))
  }, [params.id])

  useEffect(reload, [reload])

  const setStatus = async (status: string) => {
    setBusy(true)
    setError(null)
    try {
      await employerApi.updateApplicationStatus(params.id, status)
      reload()
    } catch (err) {
      setError(err instanceof Error ? err.message : "Xəta")
    } finally {
      setBusy(false)
    }
  }

  if (error && !app) {
    return (
      <div className="rounded-2xl border border-border bg-white p-8 text-center text-sm text-slate-500">
        {error}
      </div>
    )
  }

  if (!app) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-9 w-64" />
        <Skeleton className="h-80 w-full" />
      </div>
    )
  }

  const currentIndex = PIPELINE.findIndex((p) => p.status === app.status)
  const isTerminal = ["REJECTED", "HIRED", "WITHDRAWN"].includes(app.status)
  const activeStage = currentIndex >= 0 ? currentIndex : isTerminal ? PIPELINE.length : -1

  const advance = (from: string, next: string) => {
    const allowed: Record<string, string[]> = {
      SUBMITTED: ["VIEWED", "SHORTLISTED", "REJECTED"],
      VIEWED: ["SHORTLISTED", "REJECTED"],
      SHORTLISTED: ["INTERVIEW", "REJECTED"],
      INTERVIEW: ["HIRED", "REJECTED"],
    }
    return allowed[from]?.includes(next) ?? false
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <button
          onClick={() => router.push("/employer/applications")}
          className="flex items-center gap-1.5 text-[13px] font-medium text-slate-500 hover:text-slate-700"
        >
          <ArrowLeft className="h-4 w-4" /> Müraciətlər
        </button>
        <Badge variant={STATUS_VARIANTS[app.status] || "secondary"}>
          {APPLICATION_STATUS_LABELS[app.status] || app.status}
        </Badge>
      </div>

      {error && (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      <Card>
        <CardHeader className="flex-row items-center gap-4 space-y-0">
          <span className="flex h-14 w-14 items-center justify-center rounded-full bg-brand-50 text-lg font-bold text-brand-700">
            {(app.candidate_name || "?")[0]}
          </span>
          <div className="min-w-0">
            <CardTitle className="text-lg">{app.candidate_name || "Namizəd"}</CardTitle>
            <p className="flex items-center gap-1.5 text-[13px] text-slate-500">
              <Mail className="h-3.5 w-3.5" /> {app.candidate_email}
            </p>
            <p className="text-[12px] text-slate-400">
              Müraciət tarixi: {new Date(app.applied_at).toLocaleString("az-AZ")}
            </p>
          </div>
        </CardHeader>
        <CardContent className="space-y-5">
          <div>
            <h3 className="mb-1.5 text-sm font-bold text-slate-800">Vakansiya</h3>
            <Link
              href={`/employer/jobs/${app.job_id}`}
              className="text-[14px] font-semibold text-brand-600 hover:underline"
            >
              {app.job_title}
            </Link>
          </div>

          {app.cover_letter && (
            <div>
              <h3 className="mb-1.5 text-sm font-bold text-slate-800">Müraciət məktubu</h3>
              <p className="whitespace-pre-line rounded-xl bg-slate-50 p-4 text-[14px] leading-relaxed text-slate-600">
                {app.cover_letter}
              </p>
            </div>
          )}

          {/* Pipeline */}
          <div>
            <h3 className="mb-3 text-sm font-bold text-slate-800">Seçim prosesi</h3>
            <div className="flex items-center">
              {PIPELINE.map((stage, i) => {
                const done = i < activeStage
                const current = i === activeStage
                return (
                  <div key={stage.status} className="flex flex-1 items-center last:flex-none">
                    <div className="flex flex-col items-center gap-1.5">
                      <span
                        className={`flex h-9 w-9 items-center justify-center rounded-full border-2 ${
                          done
                            ? "border-brand-600 bg-brand-600 text-white"
                            : current
                              ? "border-brand-600 bg-white text-brand-600"
                              : "border-slate-200 bg-white text-slate-300"
                        }`}
                      >
                        <stage.icon className="h-4 w-4" />
                      </span>
                      <span
                        className={`text-[11px] ${
                          done || current ? "font-semibold text-slate-700" : "text-slate-400"
                        }`}
                      >
                        {stage.label}
                      </span>
                    </div>
                    {i < PIPELINE.length - 1 && (
                      <div
                        className={`mx-1 h-0.5 flex-1 rounded ${
                          i < activeStage - 1 || (i < activeStage && i < PIPELINE.length - 1)
                            ? "bg-brand-600"
                            : "bg-slate-200"
                        }`}
                      />
                    )}
                  </div>
                )
              })}
              {isTerminal && app.status === "HIRED" && (
                <div className="ml-3 flex flex-col items-center gap-1.5">
                  <span className="flex h-9 w-9 items-center justify-center rounded-full border-2 border-green-600 bg-green-600 text-white">
                    <Briefcase className="h-4 w-4" />
                  </span>
                  <span className="text-[11px] font-semibold text-green-700">İşə alındı</span>
                </div>
              )}
            </div>
          </div>

          {/* Actions */}
          {!isTerminal && (
            <div className="flex flex-wrap items-center gap-2 border-t border-border pt-4">
              {advance(app.status, "VIEWED") && (
                <Button size="sm" disabled={busy} onClick={() => setStatus("VIEWED")}>
                  Baxıldı olaraq qeyd et
                </Button>
              )}
              {advance(app.status, "SHORTLISTED") && (
                <Button size="sm" disabled={busy} onClick={() => setStatus("SHORTLISTED")}>
                  <UserCheck className="mr-1.5 h-4 w-4" /> Siyahıya al
                </Button>
              )}
              {advance(app.status, "INTERVIEW") && (
                <Button size="sm" disabled={busy} onClick={() => setStatus("INTERVIEW")}>
                  <CalendarClock className="mr-1.5 h-4 w-4" /> Müsahibəyə çağır
                </Button>
              )}
              {advance(app.status, "HIRED") && (
                <Button size="sm" disabled={busy} onClick={() => setStatus("HIRED")}>
                  <Check className="mr-1.5 h-4 w-4" /> İşə götür
                </Button>
              )}
              {advance(app.status, "REJECTED") && (
                <Button
                  variant="outline"
                  size="sm"
                  className="text-red-600"
                  disabled={busy}
                  onClick={() => setStatus("REJECTED")}
                >
                  <X className="mr-1.5 h-4 w-4" /> Rədd et
                </Button>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}