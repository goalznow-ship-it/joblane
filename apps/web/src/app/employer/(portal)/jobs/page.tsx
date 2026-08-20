"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { useRouter, useSearchParams } from "next/navigation"
import { Plus, Search, Eye, Inbox, MoreHorizontal } from "lucide-react"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Skeleton } from "@/components/ui/skeleton"
import {
  employerApi,
  type EmployerJob,
  JOB_STATUS_LABELS,
} from "@/lib/employer-api"

const STATUS_FILTERS = [
  { value: "", label: "Hamısı" },
  { value: "DRAFT", label: "Qaralama" },
  { value: "PENDING_REVIEW", label: "Yoxlamada" },
  { value: "PUBLISHED", label: "Yayımlanıb" },
  { value: "REJECTED", label: "Rədd edilib" },
  { value: "PAUSED", label: "Dayandırılıb" },
  { value: "ARCHIVED", label: "Arxiv" },
]

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

export default function EmployerJobsPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [jobs, setJobs] = useState<EmployerJob[]>([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(true)
  const [q, setQ] = useState("")
  const status = searchParams.get("status") || ""
  const page = Number(searchParams.get("page") || "1")

  useEffect(() => {
    setLoading(true)
    employerApi
      .listJobs({ status: status || undefined, q: q || undefined, page, limit: 20 })
      .then((res) => {
        setJobs(res.items)
        setTotal(res.total)
      })
      .finally(() => setLoading(false))
  }, [status, page, q])

  const setStatus = (value: string) => {
    const params = new URLSearchParams(searchParams.toString())
    if (value) params.set("status", value)
    else params.delete("status")
    params.delete("page")
    router.replace(`/employer/jobs?${params.toString()}`)
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Vakansiyalar</h1>
          <p className="mt-1 text-sm text-slate-500">Cəmi {total} vakansiya</p>
        </div>
        <Link href="/employer/jobs/new">
          <Button>
            <Plus className="mr-2 h-4 w-4" />
            Yeni vakansiya
          </Button>
        </Link>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        {STATUS_FILTERS.map((f) => (
          <button
            key={f.value}
            onClick={() => setStatus(f.value)}
            className={`rounded-full px-3.5 py-1.5 text-[13px] font-medium transition-colors ${
              status === f.value
                ? "bg-brand-600 text-white"
                : "bg-white text-slate-600 hover:bg-slate-100"
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>

      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
        <Input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Vakansiya axtar..."
          className="pl-9"
        />
      </div>

      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-24 w-full" />
          ))}
        </div>
      ) : jobs.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <p className="text-sm text-slate-500">Heç bir vakansiya tapılmadı</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {jobs.map((job) => (
            <Card key={job.id} className="transition-shadow hover:shadow-sm">
              <CardContent className="flex items-center gap-4 p-4">
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <Link
                      href={`/employer/jobs/${job.id}`}
                      className="truncate text-[15px] font-semibold text-slate-800 hover:text-brand-600"
                    >
                      {job.title}
                    </Link>
                    <Badge variant={STATUS_VARIANTS[job.status] || "secondary"}>
                      {JOB_STATUS_LABELS[job.status] || job.status}
                    </Badge>
                  </div>
                  <p className="mt-1 flex flex-wrap items-center gap-x-4 gap-y-1 text-[12px] text-slate-500">
                    {job.location && <span>{job.location}</span>}
                    {job.salary_min != null && (
                      <span>
                        {job.salary_min.toLocaleString("az-AZ")}
                        {job.salary_max != null
                          ? ` – ${job.salary_max.toLocaleString("az-AZ")}`
                          : ""}{" "}
                        {job.salary_currency || "AZN"}
                      </span>
                    )}
                    <span className="inline-flex items-center gap-1">
                      <Eye className="h-3.5 w-3.5" /> {job.views}
                    </span>
                    <span className="inline-flex items-center gap-1">
                      <Inbox className="h-3.5 w-3.5" /> {job.applications_count}
                    </span>
                  </p>
                </div>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="sm" aria-label="Əməliyyatlar">
                      <MoreHorizontal className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem
                      onClick={() => router.push(`/employer/jobs/${job.id}`)}
                    >
                      Bax
                    </DropdownMenuItem>
                    {(job.status === "DRAFT" || job.status === "REJECTED") && (
                      <DropdownMenuItem
                        onClick={() =>
                          employerApi.jobAction(job.id, "submit").then(() => {
                            setStatus(status)
                            router.refresh()
                          })
                        }
                      >
                        Yoxlamaya göndər
                      </DropdownMenuItem>
                    )}
                    {(job.status === "DRAFT" || job.status === "REJECTED") && (
                      <DropdownMenuItem
                        onClick={() =>
                          router.push(`/employer/jobs/${job.id}/edit`)
                        }
                      >
                        Redaktə et
                      </DropdownMenuItem>
                    )}
                    {(job.status === "PUBLISHED" || job.status === "APPROVED" || job.status === "PENDING_REVIEW") && (
                      <DropdownMenuItem
                        onClick={() =>
                          employerApi.jobAction(job.id, "pause").then(() => {
                            setStatus(status)
                            router.refresh()
                          })
                        }
                      >
                        Dayandır
                      </DropdownMenuItem>
                    )}
                    {job.status !== "ARCHIVED" && (
                      <DropdownMenuItem
                        className="text-red-600"
                        onClick={() =>
                          employerApi.jobAction(job.id, "archive").then(() => {
                            setStatus(status)
                            router.refresh()
                          })
                        }
                      >
                        Arxivlə
                      </DropdownMenuItem>
                    )}
                  </DropdownMenuContent>
                </DropdownMenu>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {total > 20 && (
        <div className="flex items-center justify-center gap-3">
          <Button
            variant="outline"
            size="sm"
            disabled={page <= 1}
            onClick={() => router.push(`/employer/jobs?page=${page - 1}`)}
          >
            Əvvəlki
          </Button>
          <span className="text-[13px] text-slate-500">Səhifə {page}</span>
          <Button
            variant="outline"
            size="sm"
            disabled={page * 20 >= total}
            onClick={() => router.push(`/employer/jobs?page=${page + 1}`)}
          >
            Sonrakı
          </Button>
        </div>
      )}
    </div>
  )
}