"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { Bookmark, BookmarkCheck, MapPin, Building2 } from "lucide-react"
import { Skeleton } from "@/components/ui/skeleton"
import {
  candidateApi,
  type SavedJob,
  formatSalaryRange,
  CANDIDATE_WORK_MODE_LABELS,
} from "@/lib/candidate-api"

export default function CandidateSavedPage() {
  const [saved, setSaved] = useState<SavedJob[]>([])
  const [loading, setLoading] = useState(true)
  const [message, setMessage] = useState<{ type: "ok" | "err"; text: string } | null>(null)

  const load = async () => {
    setLoading(true)
    try {
      const res = await candidateApi.listSaved({ limit: 50 })
      setSaved(res.items)
    } catch (err) {
      setMessage({ type: "err", text: err instanceof Error ? err.message : "Xəta" })
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    load()
  }, [])

  const unsave = async (jobId: string) => {
    try {
      await candidateApi.unsaveJob(jobId)
      setSaved((prev) => prev.filter((j) => j.job_id !== jobId))
      setMessage({ type: "ok", text: "Vakansiya saxlanılanlardan silindi" })
      setTimeout(() => setMessage(null), 3000)
    } catch (err) {
      setMessage({ type: "err", text: err instanceof Error ? err.message : "Xəta" })
      setTimeout(() => setMessage(null), 4000)
    }
  }

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-xl font-bold text-slate-900">Saxlanılan vakansiyalar</h1>
        <p className="mt-1 text-[13px] text-slate-500">
          Sonra baxmaq üçün saxladığınız vakansiyalar burada saxlanılır.
        </p>
      </div>

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

      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-28 w-full" />
          ))}
        </div>
      ) : saved.length === 0 ? (
        <div className="rounded-2xl border border-border bg-white p-10 text-center">
          <Bookmark className="mx-auto h-8 w-8 text-slate-300" />
          <p className="mt-3 text-[13px] text-slate-500">Saxlanılan vakansiya yoxdur.</p>
          <Link
            href="/jobs"
            className="mt-3 inline-block rounded-lg bg-brand-600 px-4 py-2 text-[12.5px] font-semibold text-white hover:bg-brand-700"
          >
            Vakansiyalara bax
          </Link>
        </div>
      ) : (
        <ul className="space-y-3">
          {saved.map((job) => (
            <li
              key={job.id}
              className="flex items-center justify-between gap-4 rounded-2xl border border-border bg-white p-5"
            >
              <Link href={`/jobs/${job.job_slug}`} className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <p className="text-[14px] font-bold text-slate-800 transition-colors hover:text-brand-600">
                    {job.job_title}
                  </p>
                  {job.is_premium && (
                    <span className="rounded-md bg-amber-50 px-1.5 py-0.5 text-[10px] font-bold text-amber-700">
                      Premium
                    </span>
                  )}
                  {job.is_urgent && (
                    <span className="rounded-md bg-red-50 px-1.5 py-0.5 text-[10px] font-bold text-red-600">
                      Təcili
                    </span>
                  )}
                </div>
                <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-[12px] text-slate-500">
                  <span className="inline-flex items-center gap-1">
                    <Building2 className="h-3.5 w-3.5" />
                    {job.company_name}
                  </span>
                  {job.location && (
                    <span className="inline-flex items-center gap-1">
                      <MapPin className="h-3.5 w-3.5" />
                      {job.location}
                    </span>
                  )}
                  {job.work_mode && (
                    <span>{CANDIDATE_WORK_MODE_LABELS[job.work_mode] || job.work_mode}</span>
                  )}
                </div>
                <p className="mt-1.5 text-[12.5px] font-bold text-brand-600">
                  {formatSalaryRange(job.salary_min, job.salary_max, job.salary_currency)}
                </p>
              </Link>
              <div className="flex shrink-0 flex-col items-end gap-2">
                <button
                  onClick={() => unsave(job.job_id)}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-border px-3 py-1.5 text-[11.5px] font-semibold text-slate-500 transition-colors hover:border-red-200 hover:bg-red-50 hover:text-red-600"
                >
                  <BookmarkCheck className="h-3.5 w-3.5" />
                  Saxlanılıb
                </button>
                <span className="text-[11px] text-slate-400">
                  Saxlanıldı: {new Date(job.saved_at).toLocaleDateString("az")}
                </span>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}