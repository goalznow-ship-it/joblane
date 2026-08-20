"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { useRouter, useSearchParams } from "next/navigation"
import { Search } from "lucide-react"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Skeleton } from "@/components/ui/skeleton"
import {
  employerApi,
  type EmployerApplication,
  APPLICATION_STATUS_LABELS,
} from "@/lib/employer-api"

const STATUS_VARIANTS: Record<string, "default" | "secondary" | "outline" | "destructive"> = {
  SUBMITTED: "default",
  VIEWED: "secondary",
  SHORTLISTED: "secondary",
  INTERVIEW: "default",
  REJECTED: "destructive",
  HIRED: "default",
  WITHDRAWN: "outline",
}

export default function EmployerApplicationsPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [items, setItems] = useState<EmployerApplication[]>([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(true)
  const [q, setQ] = useState("")
  const status = searchParams.get("status") || ""
  const jobId = searchParams.get("job_id") || ""

  useEffect(() => {
    setLoading(true)
    employerApi
      .listApplications({
        status: status || undefined,
        job_id: jobId || undefined,
        q: q || undefined,
        page: 1,
        limit: 50,
      })
      .then((res) => {
        setItems(res.items)
        setTotal(res.total)
      })
      .finally(() => setLoading(false))
  }, [status, jobId, q])

  const setParam = (key: string, value: string) => {
    const params = new URLSearchParams(searchParams.toString())
    if (value) params.set(key, value)
    else params.delete(key)
    router.replace(`/employer/applications?${params.toString()}`)
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-800">Müraciətlər</h1>
        <p className="mt-1 text-sm text-slate-500">Cəmi {total} müraciət</p>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <div className="relative max-w-xs flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <Input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Namizəd axtar..."
            className="pl-9"
          />
        </div>
        <Select value={status} onValueChange={(v) => setParam("status", v)}>
          <SelectTrigger className="w-44">
            <SelectValue placeholder="Bütün statuslar" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="">Bütün statuslar</SelectItem>
            {Object.entries(APPLICATION_STATUS_LABELS).map(([value, label]) => (
              <SelectItem key={value} value={value}>
                {label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-20 w-full" />
          ))}
        </div>
      ) : items.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-sm text-slate-500">
            Heç bir müraciət tapılmadı
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {items.map((app) => (
            <Link key={app.id} href={`/employer/applications/${app.id}`}>
              <Card className="transition-shadow hover:shadow-sm">
                <CardContent className="flex items-center gap-4 p-4">
                  <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-slate-100 text-[13px] font-bold text-slate-500">
                    {(app.candidate_name || "?")[0]}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-[14px] font-semibold text-slate-800">
                      {app.candidate_name || "Namizəd"}
                    </p>
                    <p className="truncate text-[12px] text-slate-500">
                      {app.job_title} · {app.candidate_email}
                    </p>
                    <p className="mt-0.5 text-[11px] text-slate-400">
                      {new Date(app.applied_at).toLocaleString("az-AZ")}
                    </p>
                  </div>
                  <Badge variant={STATUS_VARIANTS[app.status] || "secondary"}>
                    {APPLICATION_STATUS_LABELS[app.status] || app.status}
                  </Badge>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}