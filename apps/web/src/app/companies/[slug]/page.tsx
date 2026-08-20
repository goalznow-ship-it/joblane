"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { notFound } from "next/navigation"
import {
  MapPin,
  Globe,
  BadgeCheck,
  AlertTriangle,
  Briefcase,
  Layers,
  Calendar,
  ArrowRight,
} from "lucide-react"

import TopHeader from "@/components/marketplace/TopHeader"
import PortalSidebar from "@/components/marketplace/PortalSidebar"
import VacancyList from "@/components/marketplace/VacancyList"
import CompanyLogo from "@/components/marketplace/CompanyLogo"
import EmptyState from "@/components/marketplace/EmptyState"

import { activeApi } from "@/lib/api"
import type { Company, Job } from "@joblane/contracts"

export default function CompanyDetailPage({ params }: { params: Promise<{ slug: string }> }) {
  const [company, setCompany] = useState<Company | null>(null)
  const [jobs, setJobs] = useState<Job[]>([])
  const [totalJobs, setTotalJobs] = useState(0)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [slug, setSlug] = useState<string | null>(null)

  useEffect(() => {
    params.then((p) => setSlug(p.slug)).catch(() => setSlug(""))
  }, [params])

  useEffect(() => {
    if (!slug) return
    let cancelled = false
    setLoading(true)
    setError(null)
    activeApi
      .getCompany(slug)
      .then((found) => {
        if (cancelled) return
        if (!found) {
          notFound()
          return
        }
        setCompany(found)
        return activeApi
          .getJobs({ company: slug, limit: 50 })
          .then((res) => {
            if (cancelled) return
            setJobs(res.data)
            setTotalJobs(res.meta.total)
          })
          .catch(() => {})
      })
      .catch((err) => {
        if (cancelled) return
        console.error("Failed to fetch company:", err)
        setError("Şirkət məlumatları yüklənə bilmədi. Zəhmət olmasa yenidən cəhd edin.")
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
              href="/companies"
              className="mt-3 inline-block rounded-lg bg-amber-500 px-4 py-2 text-[12.5px] font-semibold text-white transition-colors hover:bg-amber-600"
            >
              Şirkətlərə qayıt
            </Link>
          </section>
        </div>
      </div>
    )
  }

  if (!company) return null

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
                <Link href="/companies" className="transition-colors hover:text-brand-500">Şirkətlər</Link>
                <span>/</span>
                <span className="truncate font-medium text-slate-600">{company.name}</span>
              </nav>

              <div className="space-y-5">
                <section className="rounded-xl border border-border bg-white p-5">
                  <div className="flex flex-col gap-4 sm:flex-row sm:items-start">
                    <CompanyLogo name={company.name} className="h-16 w-16 shrink-0 rounded-xl text-[18px]" />
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <h1 className="text-[22px] font-bold tracking-tight text-slate-900">
                          {company.name}
                        </h1>
                        {company.verified && (
                          <span className="flex items-center gap-1 rounded-md bg-brand-50 px-2 py-0.5 text-[11px] font-bold text-brand-600">
                            <BadgeCheck className="h-3.5 w-3.5" />
                            Təsdiq edilmiş
                          </span>
                        )}
                      </div>
                      <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1.5 text-[12.5px] text-slate-500">
                        {company.industry && (
                          <span className="flex items-center gap-1.5">
                            <Layers className="h-3.5 w-3.5 text-slate-400" />
                            {company.industry}
                          </span>
                        )}
                        {company.location && (
                          <span className="flex items-center gap-1.5">
                            <MapPin className="h-3.5 w-3.5 text-slate-400" />
                            {company.location}
                          </span>
                        )}
                        <span className="flex items-center gap-1.5">
                          <Briefcase className="h-3.5 w-3.5 text-slate-400" />
                          {totalJobs} aktiv vakansiya
                        </span>
                        <span className="flex items-center gap-1.5">
                          <Calendar className="h-3.5 w-3.5 text-slate-400" />
                          {new Date(company.createdAt).getFullYear()}-ci ildən
                        </span>
                      </div>
                      {company.website && (
                        <a
                          href={company.website}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="mt-2 inline-flex items-center gap-1.5 text-[12.5px] font-semibold text-brand-600 transition-colors hover:text-brand-700"
                        >
                          <Globe className="h-3.5 w-3.5" />
                          {company.website.replace(/^https?:\/\//, "").replace(/\/$/, "")}
                        </a>
                      )}
                    </div>
                  </div>
                  {company.description && (
                    <p className="mt-4 border-t border-border pt-4 text-[13.5px] leading-relaxed text-slate-600">
                      {company.description}
                    </p>
                  )}
                </section>

                <section>
                  <div className="mb-2.5 flex items-center justify-between">
                    <h2 className="text-[16px] font-semibold text-slate-900">Aktiv vakansiyalar</h2>
                    <span className="text-[12px] font-medium text-slate-400">{totalJobs} elan</span>
                  </div>
                  {jobs.length > 0 ? (
                    <VacancyList jobs={jobs} />
                  ) : (
                    <EmptyState
                      icon={Briefcase}
                      title="Aktiv vakansiya yoxdur"
                      subtitle="Bu şirkətin hazırda yayımlanmış vakansiyası yoxdur"
                      className="rounded-xl border border-border bg-white"
                    />
                  )}
                  <Link
                    href={`/jobs?company=${company.slug}`}
                    className="mt-3 flex w-full items-center justify-center gap-1.5 rounded-xl border border-border bg-white py-2.5 text-[13px] font-semibold text-brand-600 transition-colors duration-150 hover:border-brand-200 hover:bg-brand-50/60"
                  >
                    Şirkətin bütün vakansiyaları
                    <ArrowRight className="h-3.5 w-3.5" />
                  </Link>
                </section>
              </div>
            </main>
          </div>
        </div>
      </div>
    </div>
  )
}