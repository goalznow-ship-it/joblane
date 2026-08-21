"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { notFound } from "next/navigation"
import {
  MapPin,
  Clock,
  Briefcase,
  Calendar,
  Eye,
  ArrowRight,
  Building2,
  Globe,
  BadgeCheck,
  AlertTriangle,
  Wallet,
  Layers,
  GraduationCap,
} from "lucide-react"

import TopHeader from "@/components/marketplace/TopHeader"
import PortalSidebar from "@/components/marketplace/PortalSidebar"
import VacancyList from "@/components/marketplace/VacancyList"
import CompanyLogo from "@/components/marketplace/CompanyLogo"
import EmptyState from "@/components/marketplace/EmptyState"

import { activeApi } from "@/lib/api"
import type { Job } from "@joblane/contracts"
import { workModeLabel } from "@/components/marketplace/VacancyRow"
import { ApplyBox } from "@/components/jobs/ApplyBox"
import ReportModal from "@/app/jobs/[slug]/report-modal"

function formatSalary(job: Job): string {
  if (job.salaryMin == null && job.salaryMax == null) return "Maaş göstərilməyib"
  if (job.salaryMin != null && job.salaryMax != null)
    return `${job.salaryMin.toLocaleString("az")} - ${job.salaryMax.toLocaleString("az")} ${job.currency}`
  if (job.salaryMin != null) return `${job.salaryMin.toLocaleString("az")} ${job.currency}-dan`
  return `${job.salaryMax?.toLocaleString("az")} ${job.currency}-a qədər`
}

function formatDate(value: string): string {
  return new Date(value).toLocaleDateString("az-AZ", {
    day: "numeric",
    month: "long",
    year: "numeric",
  })
}

function formatExperience(value: Job["experienceLevel"]): string {
  switch (value) {
    case "entry":
      return "Təcrübəsiz / Başlanğıc"
    case "junior":
      return "1-3 il"
    case "mid":
      return "3-5 il"
    case "senior":
      return "5+ il"
    case "lead":
      return "Rəhbər / Lead"
    case "executive":
      return "Top menecment"
  }
}

export default function JobDetailPage({ params }: { params: Promise<{ slug: string }> }) {
  const [job, setJob] = useState<Job | null>(null)
  const [related, setRelated] = useState<Job[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [slug, setSlug] = useState<string | null>(null)
  const [reportOpen, setReportOpen] = useState(false)

  useEffect(() => {
    params.then((p) => setSlug(p.slug)).catch(() => setSlug(""))
  }, [params])

  useEffect(() => {
    if (!slug) return
    let cancelled = false
    setLoading(true)
    setError(null)
    activeApi
      .getJob(slug)
      .then((found) => {
        if (cancelled) return
        if (!found) {
          notFound()
          return
        }
        setJob(found)
        return activeApi
          .getRelatedJobs(slug, 5)
          .then((relatedJobs) => {
            if (!cancelled) setRelated(relatedJobs)
          })
          .catch(() => {})
      })
      .catch((err) => {
        if (cancelled) return
        console.error("Failed to fetch job:", err)
        setError("Vakansiya yüklənə bilmədi. Zəhmət olmasa yenidən cəhd edin.")
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [slug])

  if (loading) {
    return (
      <div className="min-h-screen bg-[#F5F7FB]">
        <TopHeader />
        <div className="flex items-center justify-center py-24">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-slate-200 border-t-brand-500" />
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen bg-[#F5F7FB]">
        <TopHeader />
        <div className="mx-auto max-w-3xl px-4 py-16">
          <section className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-6 text-center">
            <AlertTriangle className="mx-auto h-8 w-8 text-amber-500" />
            <p className="mt-3 text-[13.5px] font-semibold text-amber-800">{error}</p>
            <Link
              href="/jobs"
              className="mt-3 inline-block rounded-lg bg-amber-500 px-4 py-2 text-[12.5px] font-semibold text-white transition-colors hover:bg-amber-600"
            >
              Vakansiyalara qayıt
            </Link>
          </section>
        </div>
      </div>
    )
  }

  if (!job) return null

  const company = job.company

  return (
    <div className="min-h-screen bg-[#F5F7FB]">
      <TopHeader />

      <div className="grid w-full justify-center gap-6 min-[1400px]:grid-cols-[120px_minmax(0,1fr)_120px] min-[1800px]:grid-cols-[160px_minmax(0,1200px)_160px]">
        <div className="flex min-w-0 flex-col">
          <div className="mx-auto flex w-full max-w-[1600px] gap-5">
            <PortalSidebar />

            <main className="min-w-0 flex-1 px-4 py-4">
              <nav className="mb-3 flex items-center gap-1.5 text-[12px] text-slate-400" aria-label="Breadcrumb">
                <Link href="/" className="transition-colors hover:text-brand-500">Ana səhifə</Link>
                <span>/</span>
                <Link href="/jobs" className="transition-colors hover:text-brand-500">Vakansiyalar</Link>
                <span>/</span>
                <span className="truncate font-medium text-slate-600">{job.title}</span>
              </nav>

              <div className="space-y-5">
                <section className="rounded-xl border border-border bg-white p-5">
                  <div className="flex flex-col gap-4 sm:flex-row sm:items-start">
                    <CompanyLogo name={company.name} className="h-14 w-14 shrink-0 rounded-xl text-[16px]" />
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        {job.isPremium && (
                          <span className="rounded-md bg-amber-100 px-2 py-0.5 text-[10.5px] font-bold uppercase tracking-wide text-amber-700">
                            Premium
                          </span>
                        )}
                        {job.isFeatured && (
                          <span className="rounded-md bg-brand-50 px-2 py-0.5 text-[10.5px] font-bold uppercase tracking-wide text-brand-600">
                            Featured
                          </span>
                        )}
                        {job.isUrgent && (
                          <span className="rounded-md bg-red-50 px-2 py-0.5 text-[10.5px] font-bold uppercase tracking-wide text-red-600">
                            Təcili
                          </span>
                        )}
                        <h1 className="text-[20px] font-bold tracking-tight text-slate-900 sm:text-[22px]">
                          {job.title}
                        </h1>
                      </div>
                      <Link
                        href={`/companies/${company.slug}`}
                        className="mt-1 inline-flex items-center gap-1.5 text-[13px] font-semibold text-brand-600 transition-colors hover:text-brand-700"
                      >
                        {company.name}
                        {company.verified && <BadgeCheck className="h-3.5 w-3.5 text-brand-500" />}
                      </Link>
                      <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1.5 text-[12.5px] text-slate-500">
                        <span className="flex items-center gap-1.5">
                          <MapPin className="h-3.5 w-3.5 text-slate-400" />
                          {job.location}
                        </span>
                        <span className="flex items-center gap-1.5">
                          <Clock className="h-3.5 w-3.5 text-slate-400" />
                          {workModeLabel(job.workMode)}
                        </span>
                        <span className="flex items-center gap-1.5">
                          <Briefcase className="h-3.5 w-3.5 text-slate-400" />
                          {job.employmentType === "full_time" ? "Tam ştat" : job.employmentType.replace("_", " ")}
                        </span>
                        <span className="flex items-center gap-1.5">
                          <Eye className="h-3.5 w-3.5 text-slate-400" />
                          {job.views} baxış
                        </span>
                      </div>
                    </div>
                    <div className="shrink-0 text-left sm:text-right">
                      <p className="text-[16px] font-bold text-emerald-600">{formatSalary(job)}</p>
                      <p className="mt-1 text-[11.5px] text-slate-400">
                        Elan tarixi: {formatDate(job.publishedAt)}
                      </p>
                      {job.expiresAt && (
                        <p className="text-[11.5px] text-slate-400">Son tarix: {formatDate(job.expiresAt)}</p>
                      )}
                    </div>
                  </div>
                </section>

                <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_280px]">
                  <div className="space-y-5">
                    <section className="rounded-xl border border-border bg-white p-5">
                      <h2 className="mb-3 text-[15px] font-bold text-slate-900">Vəzifə barədə</h2>
                      <div className="prose-sm max-w-none text-[13.5px] leading-relaxed text-slate-600">
                        {job.description.split("\n").filter(Boolean).map((paragraph, i) => (
                          <p key={i} className="mb-3 last:mb-0">{paragraph}</p>
                        ))}
                      </div>
                    </section>

                    {job.requirements.length > 0 && (
                      <section className="rounded-xl border border-border bg-white p-5">
                        <h2 className="mb-3 text-[15px] font-bold text-slate-900">Tələblər</h2>
                        <ul className="space-y-2">
                          {job.requirements.map((req, i) => (
                            <li key={i} className="flex gap-2.5 text-[13px] leading-relaxed text-slate-600">
                              <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-brand-400" />
                              {req}
                            </li>
                          ))}
                        </ul>
                      </section>
                    )}

                    {job.benefits.length > 0 && (
                      <section className="rounded-xl border border-border bg-white p-5">
                        <h2 className="mb-3 text-[15px] font-bold text-slate-900">İmkanlar</h2>
                        <div className="flex flex-wrap gap-2">
                          {job.benefits.map((benefit, i) => (
                            <span key={i} className="rounded-lg border border-brand-100 bg-brand-50/70 px-2.5 py-1 text-[12px] font-medium text-brand-700">
                              {benefit}
                            </span>
                          ))}
                        </div>
                      </section>
                    )}

                    {job.skills.length > 0 && (
                      <section className="rounded-xl border border-border bg-white p-5">
                        <h2 className="mb-3 text-[15px] font-bold text-slate-900">Bacarıqlar</h2>
                        <div className="flex flex-wrap gap-2">
                          {job.skills.map((skill, i) => (
                            <span key={i} className="rounded-lg border border-border bg-slate-50 px-2.5 py-1 text-[12px] font-medium text-slate-600">
                              {skill}
                            </span>
                          ))}
                        </div>
                      </section>
                    )}
                  </div>

                  <aside className="space-y-5">
                    <ApplyBox jobId={job.id} jobSlug={job.slug} jobTitle={job.title} />

                    <section className="rounded-xl border border-border bg-white p-4">
                      <div className="mb-3 flex items-center gap-2">
                        <Wallet className="h-4 w-4 text-brand-500" />
                        <h2 className="text-[14px] font-bold text-slate-900">Maaş</h2>
                      </div>
                      <p className="text-[13.5px] font-semibold text-emerald-600">{formatSalary(job)}</p>
                      <div className="mt-3 space-y-2 border-t border-border pt-3 text-[12.5px] text-slate-600">
                        <p className="flex items-center gap-2">
                          <Layers className="h-3.5 w-3.5 text-slate-400" />
                          Təcrübə: {formatExperience(job.experienceLevel)}
                        </p>
                        <p className="flex items-center gap-2">
                          <Calendar className="h-3.5 w-3.5 text-slate-400" />
                          Yerləşdirilib: {formatDate(job.publishedAt)}
                        </p>
                        <p className="flex items-center gap-2">
                          <GraduationCap className="h-3.5 w-3.5 text-slate-400" />
                          {job.employmentType === "internship" ? "Staj" : "İşçi sayı"}:
                          <span className="capitalize">{job.employmentType.replace("_", " ")}</span>
                        </p>
                      </div>
                    </section>

                    <section className="rounded-xl border border-border bg-white p-4">
                      <div className="mb-3 flex items-center gap-2">
                        <Building2 className="h-4 w-4 text-brand-500" />
                        <h2 className="text-[14px] font-bold text-slate-900">Şirkət</h2>
                      </div>
                      <div className="flex items-center gap-3">
                        <CompanyLogo name={company.name} className="h-10 w-10 shrink-0 rounded-lg text-[11px]" />
                        <div className="min-w-0">
                          <p className="flex items-center gap-1 truncate text-[13px] font-bold text-slate-800">
                            {company.name}
                            {company.verified && <BadgeCheck className="h-3.5 w-3.5 shrink-0 text-brand-500" />}
                          </p>
                          <p className="text-[11.5px] text-slate-400">
                            {company.openJobsCount} aktiv vakansiya
                          </p>
                        </div>
                      </div>
                      {company.website && (
                        <a
                          href={company.website}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="mt-3 flex items-center gap-1.5 text-[12.5px] font-semibold text-brand-600 transition-colors hover:text-brand-700"
                        >
                          <Globe className="h-3.5 w-3.5" />
                          {company.website.replace(/^https?:\/\//, "").replace(/\/$/, "")}
                        </a>
                      )}
                      {company.description && (
                        <p className="mt-3 line-clamp-3 text-[12px] leading-relaxed text-slate-500">
                          {company.description}
                        </p>
                      )}
                      <Link
                        href={`/companies/${company.slug}`}
                        className="mt-3 flex w-full items-center justify-center gap-1.5 rounded-lg border border-border bg-slate-50 py-2 text-[12.5px] font-semibold text-slate-700 transition-colors hover:border-brand-200 hover:bg-brand-50/60"
                      >
                        Şirkət səhifəsi
                        <ArrowRight className="h-3.5 w-3.5" />
                      </Link>
                    </section>
                  </aside>
                </div>

                {related.length > 0 && (
                  <section>
                    <div className="mb-2.5 flex items-center justify-between">
                      <h2 className="text-[16px] font-semibold text-slate-900">Oxşar vakansiyalar</h2>
                      <Link href="/jobs" className="text-[12px] font-semibold text-brand-500 hover:underline">
                        Bütün vakansiyalar →
                      </Link>
                    </div>
                    <VacancyList jobs={related} />
                  </section>
                )}

                <div className="pt-4 border-t border-border">
                  <button
                    onClick={() => setReportOpen(true)}
                    className="text-[12px] text-slate-400 hover:text-slate-600 transition-colors"
                  >
                    Şikayət et
                  </button>
                </div>
              </div>
            </main>
          </div>
        </div>
      </div>

      {job && (
        <ReportModal
          jobId={job.id}
          jobTitle={job.title}
          open={reportOpen}
          onClose={() => setReportOpen(false)}
        />
      )}
    </div>
  )
}