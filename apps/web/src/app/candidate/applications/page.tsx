"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { Inbox, Undo2 } from "lucide-react"
import { Skeleton } from "@/components/ui/skeleton"
import {
  candidateApi,
  type CandidateApplication,
  CANDIDATE_APPLICATION_STATUS_LABELS,
} from "@/lib/candidate-api"

const STATUS_FILTERS = ["ALL", "SUBMITTED", "VIEWED", "SHORTLISTED", "INTERVIEW", "REJECTED", "HIRED", "WITHDRAWN"] as const

export default function CandidateApplicationsPage() {
  const [applications, setApplications] = useState<CandidateApplication[]>([])
  const [filter, setFilter] = useState<(typeof STATUS_FILTERS)[number]>("ALL")
  const [loading, setLoading] = useState(true)
  const [message, setMessage] = useState<{ type: "ok" | "err"; text: string } | null>(null)
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const pageSize = 10

  const load = async (status: string, pageNum: number) => {
    setLoading(true)
    try {
      const res = await candidateApi.listApplications({
        status: status === "ALL" ? undefined : status,
        page: pageNum,
        limit: pageSize,
      })
      setApplications(res.items)
      setTotal(res.total)
    } catch (err) {
      setMessage({ type: "err", text: err instanceof Error ? err.message : "Xəta" })
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    load(filter, page)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filter, page])

  const withdraw = async (id: string) => {
    if (!window.confirm("Müraciəti geri çəkmək istədiyinizə əminsiniz?")) return
    try {
      await candidateApi.withdraw(id)
      setMessage({ type: "ok", text: "Müraciət geri çəkildi" })
      setTimeout(() => setMessage(null), 3000)
      load(filter, page)
    } catch (err) {
      setMessage({ type: "err", text: err instanceof Error ? err.message : "Xəta" })
      setTimeout(() => setMessage(null), 4000)
    }
  }

  const totalPages = Math.max(1, Math.ceil(total / pageSize))

  const statusColor: Record<string, string> = {
    SUBMITTED: "bg-sky-50 text-sky-700",
    VIEWED: "bg-indigo-50 text-indigo-700",
    SHORTLISTED: "bg-amber-50 text-amber-700",
    INTERVIEW: "bg-violet-50 text-violet-700",
    REJECTED: "bg-red-50 text-red-700",
    HIRED: "bg-emerald-50 text-emerald-700",
    WITHDRAWN: "bg-slate-100 text-slate-500",
  }

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-xl font-bold text-slate-900">Müraciətlərim</h1>
        <p className="mt-1 text-[13px] text-slate-500">
          Təqdim etdiyiniz bütün müraciətlərin vəziyyətini buradan izləyin.
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

      <div className="flex flex-wrap gap-2">
        {STATUS_FILTERS.map((s) => (
          <button
            key={s}
            onClick={() => {
              setFilter(s)
              setPage(1)
            }}
            className={`rounded-lg px-3.5 py-1.5 text-[12px] font-semibold transition-colors ${
              filter === s
                ? "bg-brand-600 text-white"
                : "border border-border bg-white text-slate-600 hover:bg-slate-50"
            }`}
          >
            {s === "ALL" ? "Hamısı" : CANDIDATE_APPLICATION_STATUS_LABELS[s] || s}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-20 w-full" />
          ))}
        </div>
      ) : applications.length === 0 ? (
        <div className="rounded-2xl border border-border bg-white p-10 text-center">
          <Inbox className="mx-auto h-8 w-8 text-slate-300" />
          <p className="mt-3 text-[13px] text-slate-500">
            {filter === "ALL" ? "Hələ heç bir vakansiyaya müraciət etməmisiniz." : "Bu statusda müraciət yoxdur."}
          </p>
          {filter === "ALL" && (
            <Link
              href="/jobs"
              className="mt-3 inline-block rounded-lg bg-brand-600 px-4 py-2 text-[12.5px] font-semibold text-white hover:bg-brand-700"
            >
              Vakansiyalara bax
            </Link>
          )}
        </div>
      ) : (
        <>
          <ul className="divide-y divide-border rounded-2xl border border-border bg-white">
            {applications.map((app) => (
              <li key={app.id} className="flex items-center justify-between gap-3 px-5 py-4">
                <Link
                  href={`/candidate/applications/${app.id}`}
                  className="min-w-0 flex-1"
                >
                  <div className="flex items-center gap-2">
                    <p className="truncate text-[13.5px] font-semibold text-slate-800 hover:text-brand-600">
                      {app.job_title}
                    </p>
                  </div>
                  <p className="mt-0.5 truncate text-[12px] text-slate-500">
                    {app.company_name}
                    {app.location ? ` · ${app.location}` : ""}
                  </p>
                  <p className="mt-1 text-[11.5px] text-slate-400">
                    Müraciət tarixi: {new Date(app.applied_at).toLocaleDateString("az")}
                  </p>
                </Link>
                <div className="flex shrink-0 flex-col items-end gap-2">
                  <span className={`rounded-md px-2 py-1 text-[11px] font-bold ${statusColor[app.status] || "bg-slate-100 text-slate-600"}`}>
                    {CANDIDATE_APPLICATION_STATUS_LABELS[app.status] || app.status}
                  </span>
                  {app.status === "SUBMITTED" && (
                    <button
                      onClick={() => withdraw(app.id)}
                      className="inline-flex items-center gap-1 text-[11.5px] font-semibold text-slate-400 transition-colors hover:text-red-600"
                    >
                      <Undo2 className="h-3 w-3" />
                      Geri çək
                    </button>
                  )}
                </div>
              </li>
            ))}
          </ul>

          {totalPages > 1 && (
            <div className="flex items-center justify-center gap-2">
              <button
                disabled={page <= 1}
                onClick={() => setPage((p) => p - 1)}
                className="rounded-lg border border-border bg-white px-3 py-1.5 text-[12px] font-semibold text-slate-600 disabled:opacity-40"
              >
                ←
              </button>
              <span className="text-[12px] text-slate-500">
                {page} / {totalPages}
              </span>
              <button
                disabled={page >= totalPages}
                onClick={() => setPage((p) => p + 1)}
                className="rounded-lg border border-border bg-white px-3 py-1.5 text-[12px] font-semibold text-slate-600 disabled:opacity-40"
              >
                →
              </button>
            </div>
          )}
        </>
      )}
    </div>
  )
}