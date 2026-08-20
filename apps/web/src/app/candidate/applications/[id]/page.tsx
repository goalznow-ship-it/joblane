"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { useParams } from "next/navigation"
import { ArrowLeft, Undo2, Building2, MapPin, FileText } from "lucide-react"
import { Skeleton } from "@/components/ui/skeleton"
import {
  candidateApi,
  type CandidateApplication,
  CANDIDATE_APPLICATION_STATUS_LABELS,
  CANDIDATE_ROLE_LABELS,
  CANDIDATE_EMPLOYMENT_TYPE_LABELS,
  CANDIDATE_WORK_MODE_LABELS,
} from "@/lib/candidate-api"

export default function CandidateApplicationDetailPage() {
  const params = useParams<{ id: string }>()
  const [app, setApp] = useState<CandidateApplication | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [message, setMessage] = useState<{ type: "ok" | "err"; text: string } | null>(null)

  const load = async () => {
    try {
      setApp(await candidateApi.getApplication(params.id))
    } catch (err) {
      setError(err instanceof Error ? err.message : "Xəta baş verdi")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [params.id])

  const withdraw = async () => {
    if (!window.confirm("Müraciəti geri çəkmək istədiyinizə əminsiniz?")) return
    try {
      await candidateApi.withdraw(params.id)
      setMessage({ type: "ok", text: "Müraciət geri çəkildi" })
      setTimeout(() => setMessage(null), 3000)
      load()
    } catch (err) {
      setMessage({ type: "err", text: err instanceof Error ? err.message : "Xəta" })
      setTimeout(() => setMessage(null), 4000)
    }
  }

  if (loading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-64 w-full" />
      </div>
    )
  }

  if (error || !app) {
    return (
      <div className="rounded-2xl border border-border bg-white p-10 text-center">
        <p className="text-[13.5px] text-slate-500">{error || "Müraciət tapılmadı"}</p>
        <Link href="/candidate/applications" className="mt-3 inline-block text-[12.5px] font-semibold text-brand-600 hover:underline">
          ← Müraciətlərə qayıt
        </Link>
      </div>
    )
  }

  const statusColor: Record<string, string> = {
    SUBMITTED: "bg-sky-50 text-sky-700",
    VIEWED: "bg-indigo-50 text-indigo-700",
    SHORTLISTED: "bg-amber-50 text-amber-700",
    INTERVIEW: "bg-violet-50 text-violet-700",
    REJECTED: "bg-red-50 text-red-700",
    HIRED: "bg-emerald-50 text-emerald-700",
    WITHDRAWN: "bg-slate-100 text-slate-500",
  }

  const timeline = [...(app.history || [])].sort(
    (a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
  )

  return (
    <div className="space-y-5">
      <Link
        href="/candidate/applications"
        className="inline-flex items-center gap-1.5 text-[12.5px] font-semibold text-slate-500 transition-colors hover:text-brand-600"
      >
        <ArrowLeft className="h-3.5 w-3.5" />
        Müraciətlərim
      </Link>

      {message && (
        <div
          className={`rounded-xl border px-4 py-3 text-[13px] font-semibold ${
            message.type === "ok"
              ? "border-emerald-200 bg-emerald-50 text-emerald-700"
              : "border-red-200 bg-red-50 text-red-700"
          }`}
        >
          {message.text}
        </div>
      )}

      <div className="rounded-2xl border border-border bg-white">
        <div className="flex flex-col gap-4 border-b border-border p-6 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h1 className="text-lg font-bold text-slate-900">{app.job_title}</h1>
            <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-[12.5px] text-slate-500">
              <span className="inline-flex items-center gap-1">
                <Building2 className="h-3.5 w-3.5" />
                {app.company_name}
              </span>
              {app.location && (
                <span className="inline-flex items-center gap-1">
                  <MapPin className="h-3.5 w-3.5" />
                  {app.location}
                </span>
              )}
              {app.employment_type && (
                <span>{CANDIDATE_EMPLOYMENT_TYPE_LABELS[app.employment_type] || app.employment_type}</span>
              )}
              {app.work_mode && (
                <span>{CANDIDATE_WORK_MODE_LABELS[app.work_mode] || app.work_mode}</span>
              )}
            </div>
          </div>
          <div className="flex shrink-0 items-center gap-3">
            <span className={`rounded-md px-2.5 py-1 text-[11.5px] font-bold ${statusColor[app.status] || "bg-slate-100 text-slate-600"}`}>
              {CANDIDATE_APPLICATION_STATUS_LABELS[app.status] || app.status}
            </span>
            {app.status === "SUBMITTED" && (
              <button
                onClick={withdraw}
                className="inline-flex items-center gap-1.5 rounded-lg border border-red-200 bg-red-50 px-3 py-1.5 text-[12px] font-semibold text-red-600 transition-colors hover:bg-red-100"
              >
                <Undo2 className="h-3.5 w-3.5" />
                Geri çək
              </button>
            )}
          </div>
        </div>

        <div className="grid gap-6 p-6 lg:grid-cols-3">
          <div className="space-y-5 lg:col-span-2">
            <section>
              <h2 className="text-[13.5px] font-bold text-slate-800">Müraciət məlumatları</h2>
              <dl className="mt-3 space-y-2.5 text-[13px]">
                <div className="flex justify-between gap-4">
                  <dt className="text-slate-500">Müraciət tarixi</dt>
                  <dd className="font-semibold text-slate-700">
                    {new Date(app.applied_at).toLocaleString("az")}
                  </dd>
                </div>
                <div className="flex justify-between gap-4">
                  <dt className="text-slate-500">Müraciət ID</dt>
                  <dd className="font-mono text-[12px] text-slate-600">{app.id}</dd>
                </div>
                {app.resume_title && (
                  <div className="flex justify-between gap-4">
                    <dt className="text-slate-500">CV</dt>
                    <dd className="inline-flex items-center gap-1 font-semibold text-slate-700">
                      <FileText className="h-3.5 w-3.5" />
                      {app.resume_title}
                    </dd>
                  </div>
                )}
              </dl>
            </section>

            {app.cover_letter && (
              <section>
                <h2 className="text-[13.5px] font-bold text-slate-800">Müşayiət məktubu</h2>
                <p className="mt-2 whitespace-pre-wrap rounded-xl bg-slate-50 p-4 text-[13px] leading-relaxed text-slate-600">
                  {app.cover_letter}
                </p>
              </section>
            )}

            <section>
              <h2 className="text-[13.5px] font-bold text-slate-800">Vəziyyət tarixçəsi</h2>
              <ol className="mt-3 space-y-0">
                {timeline.map((entry, idx) => (
                  <li key={entry.id} className="relative flex gap-3 pb-5 last:pb-0">
                    {idx < timeline.length - 1 && (
                      <span className="absolute left-[5px] top-3.5 h-full w-px bg-slate-200" />
                    )}
                    <span className={`relative mt-1.5 h-[11px] w-[11px] shrink-0 rounded-full ${
                      idx === timeline.length - 1 ? "bg-brand-500" : "bg-slate-300"
                    }`} />
                    <div className="min-w-0">
                      <p className="text-[12.5px] font-bold text-slate-700">
                        {CANDIDATE_APPLICATION_STATUS_LABELS[entry.to_status] || entry.to_status}
                      </p>
                      <p className="text-[11.5px] text-slate-400">
                        {new Date(entry.created_at).toLocaleString("az")} ·{" "}
                        {CANDIDATE_ROLE_LABELS[entry.changed_by_role] || entry.changed_by_role}
                      </p>
                      {entry.note && (
                        <p className="mt-1 rounded-lg bg-slate-50 px-3 py-2 text-[12px] text-slate-600">
                          {entry.note}
                        </p>
                      )}
                    </div>
                  </li>
                ))}
              </ol>
            </section>
          </div>

          <aside className="space-y-3">
            <Link
              href={`/jobs/${app.job_slug}`}
              className="block rounded-xl border border-border p-4 text-center text-[13px] font-bold text-brand-600 transition-colors hover:bg-brand-50"
            >
              Vakansiyaya bax
            </Link>
            <Link
              href="/jobs"
              className="block rounded-xl border border-border p-4 text-center text-[13px] font-bold text-slate-600 transition-colors hover:bg-slate-50"
            >
              Digər vakansiyalar
            </Link>
          </aside>
        </div>
      </div>
    </div>
  )
}