"use client"

import { useCallback, useEffect, useState } from "react"
import { useParams, useRouter } from "next/navigation"
import Link from "next/link"
import {
  ArrowLeft,
  Eye,
  Inbox,
  Send,
  Pause,
  Archive,
  Pencil,
  Clock,
  AlertTriangle,
} from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import {
  employerApi,
  type EmployerJob,
  JOB_STATUS_LABELS,
  EMPLOYMENT_TYPE_LABELS,
  WORK_MODE_LABELS,
} from "@/lib/employer-api"

const STATUS_VARIANTS: Record<string, "default" | "secondary" | "outline" | "destructive"> = {
  PUBLISHED: "default",
  APPROVED: "default",
  DRAFT: "secondary",
  PENDING_REVIEW: "secondary",
  PAUSED: "outline",
  REJECTED: "destructive",
  ARCHIVED: "outline",
  EXPIRED: "outline",
}

export default function JobDetailPage() {
  const params = useParams<{ id: string }>()
  const router = useRouter()
  const [job, setJob] = useState<EmployerJob | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  const reload = useCallback(() => {
    employerApi
      .getJob(params.id)
      .then(setJob)
      .catch((err) => setError(err instanceof Error ? err.message : "Xəta"))
  }, [params.id])

  useEffect(reload, [reload])

  const runAction = async (action: "submit" | "pause" | "archive") => {
    setBusy(true)
    setError(null)
    try {
      await employerApi.jobAction(params.id, action)
      reload()
    } catch (err) {
      setError(err instanceof Error ? err.message : "Xəta")
    } finally {
      setBusy(false)
    }
  }

  if (error && !job) {
    return (
      <div className="rounded-2xl border border-border bg-white p-8 text-center text-sm text-slate-500">
        {error}
      </div>
    )
  }

  if (!job) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-9 w-72" />
        <Skeleton className="h-72 w-full" />
      </div>
    )
  }

  const editable = job.status === "DRAFT" || job.status === "REJECTED"

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <button
          onClick={() => router.push("/employer/jobs")}
          className="flex items-center gap-1.5 text-[13px] font-medium text-slate-500 hover:text-slate-700"
        >
          <ArrowLeft className="h-4 w-4" /> Vakansiyalar
        </button>
        <Badge variant={STATUS_VARIANTS[job.status] || "secondary"}>
          {JOB_STATUS_LABELS[job.status] || job.status}
        </Badge>
      </div>

      {error && (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      {job.status === "REJECTED" && (
        <div className="rounded-xl border border-red-200 bg-red-50 p-4">
          <div className="flex items-start gap-3">
            <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-red-600" />
            <div className="text-sm text-red-800">
              <p className="font-semibold">Vakansiya rədd edildi</p>
              {job.moderation_reason && (
                <p className="mt-1">
                  <span className="font-medium">Səbəb:</span> {job.moderation_reason}
                </p>
              )}
              {job.moderation_note && (
                <p className="mt-0.5">
                  <span className="font-medium">Qeyd:</span> {job.moderation_note}
                </p>
              )}
              <p className="mt-2">
                Vakansiyanı redaktə edib yenidən yoxlamaya göndərə bilərsiniz.
              </p>
            </div>
          </div>
        </div>
      )}

      <Card>
        <CardHeader className="flex-row flex-wrap items-start justify-between gap-3 space-y-0">
          <div className="space-y-1.5">
            <CardTitle className="text-xl">{job.title}</CardTitle>
            <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-[13px] text-slate-500">
              {job.location && <span>{job.location}</span>}
              {job.employment_type && (
                <span>{EMPLOYMENT_TYPE_LABELS[job.employment_type] || job.employment_type}</span>
              )}
              {job.work_mode && (
                <span>{WORK_MODE_LABELS[job.work_mode] || job.work_mode}</span>
              )}
              {job.salary_min != null && (
                <span>
                  {job.salary_min.toLocaleString("az-AZ")}
                  {job.salary_max != null
                    ? ` – ${job.salary_max.toLocaleString("az-AZ")}`
                    : ""}{" "}
                  {job.salary_currency || "AZN"}
                </span>
              )}
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            {editable && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => router.push(`/employer/jobs/${job.id}/edit`)}
              >
                <Pencil className="mr-1.5 h-3.5 w-3.5" /> Redaktə et
              </Button>
            )}
            {editable && (
              <Button size="sm" disabled={busy} onClick={() => runAction("submit")}>
                <Send className="mr-1.5 h-3.5 w-3.5" /> Yoxlamaya göndər
              </Button>
            )}
            {(job.status === "PUBLISHED" ||
              job.status === "APPROVED" ||
              job.status === "PENDING_REVIEW") && (
              <Button variant="outline" size="sm" disabled={busy} onClick={() => runAction("pause")}>
                <Pause className="mr-1.5 h-3.5 w-3.5" /> Dayandır
              </Button>
            )}
            {job.status !== "ARCHIVED" && (
              <Button
                variant="outline"
                size="sm"
                className="text-red-600"
                disabled={busy}
                onClick={() => runAction("archive")}
              >
                <Archive className="mr-1.5 h-3.5 w-3.5" /> Arxivlə
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent className="space-y-5">
          <div className="flex flex-wrap gap-x-6 gap-y-2 text-[13px] text-slate-500">
            <span className="inline-flex items-center gap-1.5">
              <Eye className="h-4 w-4" /> {job.views} baxış
            </span>
            <span className="inline-flex items-center gap-1.5">
              <Inbox className="h-4 w-4" />
              <Link href={`/employer/applications?job_id=${job.id}`} className="hover:text-brand-600 hover:underline">
                {job.applications_count} müraciət
              </Link>
            </span>
            {job.publication_date && (
              <span className="inline-flex items-center gap-1.5">
                <Clock className="h-4 w-4" /> Yayım:{" "}
                {new Date(job.publication_date).toLocaleDateString("az-AZ")}
              </span>
            )}
            {job.application_deadline && (
              <span>
                Son tarix: {new Date(job.application_deadline).toLocaleDateString("az-AZ")}
              </span>
            )}
            {job.experience_level && <span>Təcrübə: {job.experience_level}</span>}
          </div>

          {job.description && (
            <div>
              <h3 className="mb-1.5 text-sm font-bold text-slate-800">Vəzifə təsviri</h3>
              <p className="whitespace-pre-line text-[14px] leading-relaxed text-slate-600">
                {job.description}
              </p>
            </div>
          )}
          {job.requirements && (
            <div>
              <h3 className="mb-1.5 text-sm font-bold text-slate-800">Tələblər</h3>
              <div className="space-y-1 text-[14px] text-slate-600">
                {job.requirements.split("\n").filter(Boolean).map((line, i) => (
                  <p key={i} className="flex gap-2">
                    <span className="text-brand-500">•</span>
                    {line}
                  </p>
                ))}
              </div>
            </div>
          )}
          {job.responsibilities && (
            <div>
              <h3 className="mb-1.5 text-sm font-bold text-slate-800">Öhdəliklər</h3>
              <div className="space-y-1 text-[14px] text-slate-600">
                {job.responsibilities.split("\n").filter(Boolean).map((line, i) => (
                  <p key={i} className="flex gap-2">
                    <span className="text-brand-500">•</span>
                    {line}
                  </p>
                ))}
              </div>
            </div>
          )}
          {job.benefits && (
            <div>
              <h3 className="mb-1.5 text-sm font-bold text-slate-800">İmtiyazlar</h3>
              <div className="space-y-1 text-[14px] text-slate-600">
                {job.benefits.split("\n").filter(Boolean).map((line, i) => (
                  <p key={i} className="flex gap-2">
                    <span className="text-brand-500">•</span>
                    {line}
                  </p>
                ))}
              </div>
            </div>
          )}
          {job.education && (
            <p className="text-[13px] text-slate-500">Təhsil: {job.education}</p>
          )}
        </CardContent>
      </Card>

      {job.moderation_history && job.moderation_history.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Status tarixçəsi</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {job.moderation_history.map((h) => (
              <div key={h.id} className="flex items-start gap-3 text-[13px]">
                <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-brand-400" />
                <div>
                  <p className="text-slate-700">
                    {JOB_STATUS_LABELS[h.from_status || "DRAFT"] || h.from_status} →{" "}
                    <span className="font-semibold">
                      {JOB_STATUS_LABELS[h.to_status] || h.to_status}
                    </span>
                  </p>
                  <p className="text-[12px] text-slate-400">
                    {h.actor_email || "Sistem"} ·{" "}
                    {new Date(h.created_at).toLocaleString("az-AZ")}
                  </p>
                  {h.note && <p className="mt-1 text-slate-500">Qeyd: {h.note}</p>}
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      )}
    </div>
  )
}