"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { UserRound, FileText, Inbox, Bookmark, ArrowRight, CircleCheckBig } from "lucide-react"
import { Card, CardContent } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import {
  candidateApi,
  type CandidateMe,
  CANDIDATE_APPLICATION_STATUS_LABELS,
} from "@/lib/candidate-api"

export default function CandidateDashboardPage() {
  const router = useRouter()
  const [me, setMe] = useState<CandidateMe | null>(null)
  const [applications, setApplications] = useState<NonNullable<Awaited<ReturnType<typeof candidateApi.listApplications>>>["items"]>([])
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    Promise.all([candidateApi.me(), candidateApi.listApplications({ limit: 5 })])
      .then(([meData, apps]) => {
        if (cancelled) return
        setMe(meData)
        setApplications(apps.items)
      })
      .catch((err) => {
        if (cancelled) return
        setError(err instanceof Error ? err.message : "Xəta baş verdi")
      })
    return () => {
      cancelled = true
    }
  }, [])

  if (error) {
    return (
      <div className="rounded-2xl border border-border bg-white p-8 text-center text-sm text-slate-500">
        {error}
      </div>
    )
  }

  if (!me) {
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

  const profileMissing = !me.profile || me.profile.headline == null

  const stats = [
    {
      icon: UserRound,
      label: "Profil tamlığı",
      value: me.profile ? (me.profile.headline ? "Tamamlanıb" : "Qismən") : "Başlanmayıb",
      href: "/candidate/profile",
    },
    {
      icon: FileText,
      label: "CV-lər",
      value: me.resumes.length,
      href: "/candidate/resume",
    },
    {
      icon: Inbox,
      label: "Müraciətlər",
      value: me.applications_count,
      href: "/candidate/applications",
    },
    {
      icon: Bookmark,
      label: "Saxlanılan vakansiyalar",
      value: me.saved_jobs_count,
      href: "/candidate/saved",
    },
  ]

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-bold text-slate-900">
          Salam, {me.full_name || me.email.split("@")[0]}!
        </h1>
        <p className="mt-1 text-[13px] text-slate-500">
          Namizəd panelinizə xoş gəlmisiniz. Profilinizi tamamlayın və vakansiyalara müraciət edin.
        </p>
      </div>

      {profileMissing && (
        <div className="flex flex-col gap-3 rounded-2xl border border-brand-100 bg-brand-50/70 p-5 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-start gap-3">
            <CircleCheckBig className="mt-0.5 h-5 w-5 shrink-0 text-brand-600" />
            <div>
              <p className="text-[13.5px] font-bold text-brand-800">Profilinizi tamamlayın</p>
              <p className="mt-0.5 text-[12.5px] text-brand-700">
                İşəgötürənlərin sizi daha yaxşı görməsi üçün peşə başlığınızı və bacarıqlarınızı əlavə edin.
              </p>
            </div>
          </div>
          <Link
            href="/candidate/profile"
            className="inline-flex shrink-0 items-center justify-center gap-1.5 rounded-lg bg-brand-600 px-4 py-2 text-[12.5px] font-semibold text-white transition-colors hover:bg-brand-700"
          >
            Profili doldur
            <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </div>
      )}

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {stats.map(({ icon: Icon, label, value, href }) => (
          <Link key={href} href={href}>
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
          </Link>
        ))}
      </div>

      <div className="rounded-2xl border border-border bg-white">
        <div className="flex items-center justify-between border-b border-border px-5 py-4">
          <h2 className="text-[14.5px] font-bold text-slate-900">Son müraciətləriniz</h2>
          <Link href="/candidate/applications" className="text-[12px] font-semibold text-brand-600 hover:underline">
            Hamısı →
          </Link>
        </div>
        {applications.length === 0 ? (
          <div className="px-5 py-10 text-center">
            <p className="text-[13px] text-slate-500">Hələ heç bir vakansiyaya müraciət etməmisiniz.</p>
            <button
              onClick={() => router.push("/jobs")}
              className="mt-3 rounded-lg bg-brand-600 px-4 py-2 text-[12.5px] font-semibold text-white transition-colors hover:bg-brand-700"
            >
              Vakansiyalara bax
            </button>
          </div>
        ) : (
          <ul className="divide-y divide-border">
            {applications.map((app) => (
              <li key={app.id}>
                <Link
                  href={`/candidate/applications/${app.id}`}
                  className="flex items-center justify-between gap-3 px-5 py-3.5 transition-colors hover:bg-slate-50"
                >
                  <div className="min-w-0">
                    <p className="truncate text-[13.5px] font-semibold text-slate-800">{app.job_title}</p>
                    <p className="truncate text-[12px] text-slate-500">{app.company_name}</p>
                  </div>
                  <span className="shrink-0 rounded-md bg-slate-100 px-2 py-1 text-[11px] font-semibold text-slate-600">
                    {CANDIDATE_APPLICATION_STATUS_LABELS[app.status] || app.status}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  )
}