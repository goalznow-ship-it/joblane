"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import {
  Briefcase,
  Eye,
  Inbox,
  FileCheck2,
  UserCheck,
  ArrowRight,
  Clock,
} from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import {
  employerApi,
  type EmployerDashboard as DashboardData,
  APPLICATION_STATUS_LABELS,
} from "@/lib/employer-api"

function StatCard({
  icon: Icon,
  label,
  value,
  href,
}: {
  icon: typeof Briefcase
  label: string
  value: number | string
  href?: string
}) {
  const body = (
    <Card className="transition-shadow hover:shadow-sm">
      <CardContent className="flex items-center gap-4 p-5">
        <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-brand-50 text-brand-600">
          <Icon className="h-5 w-5" />
        </span>
        <div className="min-w-0">
          <p className="text-2xl font-bold text-slate-800">{value}</p>
          <p className="truncate text-[12px] text-slate-500">{label}</p>
        </div>
      </CardContent>
    </Card>
  )
  return href ? <Link href={href}>{body}</Link> : body
}

export default function EmployerDashboardPage() {
  const [data, setData] = useState<DashboardData | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    employerApi
      .dashboard()
      .then(setData)
      .catch((err) => setError(err instanceof Error ? err.message : "Xəta"))
  }, [])

  if (error) {
    return (
      <div className="rounded-2xl border border-border bg-white p-8 text-center text-sm text-slate-500">
        {error}
      </div>
    )
  }

  if (!data) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-9 w-72" />
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {[1, 2, 3, 4].map((i) => (
            <Skeleton key={i} className="h-24" />
          ))}
        </div>
        <Skeleton className="h-64" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">
            Salam, {data.company.name} 👋
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            Şirkətinizin vakansiya və müraciət statistikası
          </p>
        </div>
        <Badge
          variant={data.company.status === "VERIFIED" ? "default" : "secondary"}
          className="capitalize"
        >
          {data.company.status === "VERIFIED"
            ? "Təsdiqlənmiş şirkət"
            : data.company.status === "PENDING"
              ? "Təsdiq gözləyir"
              : data.company.status}
        </Badge>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          icon={Briefcase}
          label="Ümumi vakansiya"
          value={data.jobs_total}
          href="/employer/jobs"
        />
        <StatCard
          icon={Inbox}
          label="Yeni müraciət"
          value={data.applications_new}
          href="/employer/applications"
        />
        <StatCard
          icon={FileCheck2}
          label="Müsahibə"
          value={data.applications_interview}
          href="/employer/applications"
        />
        <StatCard
          icon={Eye}
          label="Ümumi baxış"
          value={data.total_views}
        />
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Job status summary */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Vakansiya vəziyyəti</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2.5">
            {[
              { label: "Yayımlanıb", value: data.jobs_published, key: "PUBLISHED" },
              { label: "Yoxlamada", value: data.jobs_pending_review, key: "PENDING_REVIEW" },
              { label: "Qaralama", value: data.jobs_draft, key: "DRAFT" },
              { label: "Dayandırılıb", value: data.jobs_paused, key: "PAUSED" },
              { label: "Rədd edilib", value: data.jobs_rejected, key: "REJECTED" },
              { label: "Arxivləşdirilib", value: data.jobs_archived, key: "ARCHIVED" },
            ].map((row) => (
              <div key={row.key} className="flex items-center justify-between">
                <span className="text-[13px] text-slate-600">{row.label}</span>
                <span className="text-[13px] font-semibold text-slate-800">
                  {row.value}
                </span>
              </div>
            ))}
            <Link
              href="/employer/jobs"
              className="mt-2 flex items-center gap-1.5 text-[13px] font-semibold text-brand-600 hover:text-brand-700"
            >
              Bütün vakansiyalar <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </CardContent>
        </Card>

        {/* Recent applications */}
        <Card className="lg:col-span-2">
          <CardHeader className="flex-row items-center justify-between space-y-0">
            <CardTitle className="text-base">Son müraciətlər</CardTitle>
            <Link
              href="/employer/applications"
              className="flex items-center gap-1.5 text-[13px] font-semibold text-brand-600 hover:text-brand-700"
            >
              Bütün müraciətlər <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </CardHeader>
          <CardContent>
            {data.recent_applications.length === 0 ? (
              <p className="py-8 text-center text-sm text-slate-400">
                Hələ müraciət yoxdur
              </p>
            ) : (
              <div className="divide-y divide-border">
                {data.recent_applications.map((app) => (
                  <Link
                    key={app.id}
                    href={`/employer/applications/${app.id}`}
                    className="flex items-center gap-3 py-3 transition-colors hover:bg-slate-50"
                  >
                    <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-slate-100 text-[12px] font-bold text-slate-500">
                      {(app.candidate_name || "?")[0]}
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-[13px] font-semibold text-slate-800">
                        {app.candidate_name || "Namizəd"}
                      </p>
                      <p className="truncate text-[12px] text-slate-500">
                        {app.job_title}
                      </p>
                    </div>
                    <Badge variant="secondary">
                      {APPLICATION_STATUS_LABELS[app.status] || app.status}
                    </Badge>
                  </Link>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Company status note */}
      {data.company.status === "PENDING" && (
        <Card className="border-amber-200 bg-amber-50">
          <CardContent className="flex items-start gap-3 p-5">
            <Clock className="mt-0.5 h-5 w-5 shrink-0 text-amber-600" />
            <div className="text-sm text-amber-800">
              <p className="font-semibold">Şirkət profili təsdiq gözləyir</p>
              <p className="mt-0.5">
                Vakansiyalarınız yoxlamaya göndərildikdən sonra moderator tərəfindən
                yoxlanacaq və şirkət təsdiqləndikdən sonra yayımlana bilər.
              </p>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}