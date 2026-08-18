"use client"

import { useMemo, useState } from "react"
import Link from "next/link"
import { FileText, Building2, Briefcase, ArrowRight } from "lucide-react"

import TopHeader from "@/components/marketplace/TopHeader"
import PortalSidebar from "@/components/marketplace/PortalSidebar"
import CompanyStrip from "@/components/marketplace/CompanyStrip"
import MarketplaceSearch from "@/components/marketplace/MarketplaceSearch"
import VacancyList from "@/components/marketplace/VacancyList"
import RightRail from "@/components/marketplace/RightRail"
import AdvertisementSlot from "@/components/marketplace/AdvertisementSlot"
import SideSkin from "@/components/marketplace/SideSkin"
import CompanyLogo from "@/components/marketplace/CompanyLogo"

import { categories, companies, jobs, getAdsByPlacement } from "@/lib/fixtures"

export default function HomePage() {
  const [query, setQuery] = useState<Record<string, string>>({})
  const [saved, setSaved] = useState<Set<string>>(new Set())

  const toggleSave = (id: string) => {
    setSaved((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const matches = (j: (typeof jobs)[number]) => {
    const keyword = (query.keyword ?? "").toLowerCase()
    if (keyword) {
      const haystack = `${j.title} ${j.company.name} ${j.skills.join(" ")}`.toLowerCase()
      if (!haystack.includes(keyword)) return false
    }
    if (query.category && j.company.id !== query.category) return false
    if (query.region && !j.location.toLowerCase().includes(query.region)) return false
    if (query.workMode && j.workMode !== query.workMode) return false
    if (query.employmentType && j.employmentType !== query.employmentType) return false
    if (query.experience && j.experienceLevel !== query.experience) return false
    if (query.salaryShown && j.salaryMin == null && j.salaryMax == null) return false
    if (query.salaryMin && (j.salaryMax ?? 0) < Number(query.salaryMin)) return false
    if (query.salaryMax && (j.salaryMin ?? 0) > Number(query.salaryMax)) return false
    return true
  }

  const selectedJobs = useMemo(
    () =>
      jobs
        .filter((j) => j.isPremium)
        .sort((a, b) => b.views - a.views),
    []
  )

  const latestJobs = useMemo(
    () =>
      jobs
        .filter((j) => !j.isPremium && matches(j))
        .sort(
          (a, b) =>
            new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime()
        ),
    [query]
  )

  const hasActiveQuery = Object.values(query).some(Boolean)
  const shownLatest = hasActiveQuery ? latestJobs : latestJobs.slice(0, 12)

  const topCompanies = useMemo(
    () => [...companies].sort((a, b) => b.openJobsCount - a.openJobsCount).slice(0, 8),
    []
  )

  const trendingCategories = useMemo(
    () => [...categories].sort((a, b) => b.jobsCount - a.jobsCount).slice(0, 6),
    []
  )

  const featuredCompany = topCompanies[0]

  const sidebarAds = getAdsByPlacement("sidebar_rectangle")
  const rightRailAd = sidebarAds[0]
  const topLeaderboard = getAdsByPlacement("top_leaderboard")
  const inlineAd = getAdsByPlacement("inline_feed")[0]

  const topAdDesktop = topLeaderboard.find((ad) => ad.format === "970x90")
  const topAdResponsive = topLeaderboard.find((ad) => ad.format === "320x100")

  return (
    <div className="min-h-screen bg-[#F5F7FB]">
      <TopHeader />

      <div className="grid w-full justify-center gap-6 min-[1400px]:grid-cols-[120px_minmax(0,1fr)_120px] min-[1800px]:grid-cols-[160px_minmax(0,1200px)_160px]">
        <SideSkin side="left" />

        <div className="flex min-w-0 flex-col">
          {topAdDesktop && (
            <div className="hidden border-b border-border/70 bg-[#FAFBFF] lg:block">
              <div className="mx-auto w-full max-w-[1600px] px-4 pt-1.5 pb-4 lg:px-6">
                <AdvertisementSlot
                  ad={topAdDesktop}
                  className="mx-auto w-full max-w-[970px]"
                />
              </div>
            </div>
          )}
          {topAdResponsive && (
            <div className="border-b border-border/70 bg-[#FAFBFF] lg:hidden">
              <div className="mx-auto w-full max-w-[320px] px-4 pt-1.5 pb-3.5">
                <AdvertisementSlot ad={topAdResponsive} className="w-full" />
              </div>
            </div>
          )}

          <div className="mx-auto flex w-full max-w-[1600px] gap-5">
          <PortalSidebar />

        <main className="min-w-0 flex-1 px-4 py-4">
          <div className="mb-3 flex items-end justify-between">
            <div>
              <h1 className="text-[24px] font-bold tracking-tight text-slate-900">
                Vakansiyalar
              </h1>
              <p className="mt-0.5 text-[12.5px] text-slate-500">
                Azərbaycanın aparıcı şirkətlərindən canlı iş elanları
              </p>
            </div>
            <span className="mb-0.5 hidden rounded-lg border border-brand-100 bg-brand-50 px-3 py-1 text-[12px] font-semibold text-brand-600 sm:block">
              {jobs.length} vakansiya
            </span>
          </div>

          <div className="space-y-6">
            <CompanyStrip companies={companies.slice(0, 10)} />

            <MarketplaceSearch onSearch={setQuery} />

            <section>
              <div className="mb-2.5 flex items-center justify-between">
                <h2 className="text-[16px] font-semibold text-slate-900">
                  Seçilmiş vakansiyalar
                </h2>
                <span className="text-[12px] font-medium text-slate-400">
                  {selectedJobs.length} elan
                </span>
              </div>
              <VacancyList jobs={selectedJobs} onSave={toggleSave} savedIds={saved} />
            </section>

            <section>
              <div className="mb-2.5 flex items-center justify-between">
                <h2 className="text-[16px] font-semibold text-slate-900">
                  Son vakansiyalar
                </h2>
                <span className="text-[12px] font-medium text-slate-400">
                  {shownLatest.length} elan
                </span>
              </div>
              <VacancyList
                jobs={shownLatest}
                inlineAd={inlineAd}
                adEvery={8}
                onSave={toggleSave}
                savedIds={saved}
              />
              <Link
                href="/jobs"
                className="mt-3 flex w-full items-center justify-center gap-1.5 rounded-xl border border-border bg-white py-2.5 text-[13px] font-semibold text-brand-600 transition-colors duration-150 hover:border-brand-200 hover:bg-brand-50/60"
              >
                Bütün vakansiyalara bax
                <ArrowRight className="h-3.5 w-3.5" />
              </Link>
            </section>

            <section className="rounded-xl border border-border bg-white p-4">
              <div className="mb-3 flex items-center justify-between">
                <h2 className="text-[16px] font-bold text-slate-900">
                  Populyar kateqoriyalar
                </h2>
                <Link
                  href="/categories"
                  className="text-[12px] font-semibold text-brand-500 hover:underline"
                >
                  Bütün kateqoriyalar →
                </Link>
              </div>
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 xl:grid-cols-4">
                {categories.slice(0, 12).map((cat) => (
                  <Link
                    key={cat.id}
                    href={`/categories/${cat.slug}`}
                    className="group flex items-center justify-between rounded-xl border border-border bg-slate-50/60 px-3 py-2.5 transition-colors hover:border-brand-200 hover:bg-brand-50/60"
                  >
                    <span className="flex items-center gap-2 text-[12.5px] font-semibold text-slate-700 group-hover:text-brand-600">
                      <Briefcase className="h-3.5 w-3.5 text-slate-400 group-hover:text-brand-500" />
                      {cat.name}
                    </span>
                    <span className="rounded-full bg-white px-1.5 py-0.5 text-[11px] font-bold text-slate-400">
                      {cat.jobsCount}
                    </span>
                  </Link>
                ))}
              </div>
            </section>

            <section className="rounded-xl border border-border bg-white p-4">
              <div className="mb-3 flex items-center justify-between">
                <h2 className="text-[16px] font-semibold text-slate-900">Top şirkətlər</h2>
                <Link
                  href="/companies"
                  className="text-[12px] font-semibold text-brand-500 hover:text-brand-600"
                >
                  Bütün şirkətlər →
                </Link>
              </div>
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                {topCompanies.map((company) => (
                  <Link
                    key={company.id}
                    href={`/companies/${company.slug}`}
                    className="flex items-center gap-2.5 rounded-lg border border-border bg-slate-50/60 px-3 py-2.5 transition-colors duration-150 hover:border-brand-200 hover:bg-brand-50/60"
                  >
                    <CompanyLogo name={company.name} className="h-8 w-8 shrink-0 rounded-lg text-[10px]" />
                    <div className="min-w-0">
                      <p className="truncate text-[12.5px] font-semibold text-slate-700">
                        {company.name}
                      </p>
                      <p className="text-[11px] text-slate-400">
                        {company.openJobsCount} vakansiya
                      </p>
                    </div>
                  </Link>
                ))}
              </div>
            </section>

            <section className="grid gap-3 sm:grid-cols-2">
              <Link
                href="/resume/create"
                className="group flex items-center gap-4 rounded-xl border border-border bg-white p-4 transition-all duration-150 hover:border-brand-200 hover:shadow-sm"
              >
                <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-brand-50 text-brand-600 transition-colors group-hover:bg-brand-500 group-hover:text-white">
                  <FileText className="h-5 w-5" />
                </span>
                <div>
                  <p className="text-[13.5px] font-bold text-slate-800">
                    CV yarat
                  </p>
                  <p className="text-[12px] text-slate-500">
                    Peşəkar CV-nizi dəqiqələr ərzində hazırlayın
                  </p>
                </div>
              </Link>
              <Link
                href="/employer/post-job"
                className="group flex items-center gap-4 rounded-xl border border-border bg-white p-4 transition-all duration-150 hover:border-brand-200 hover:shadow-sm"
              >
                <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-accent-50 text-accent-600 transition-colors group-hover:bg-accent-600 group-hover:text-white">
                  <Building2 className="h-5 w-5" />
                </span>
                <div>
                  <p className="text-[13.5px] font-bold text-slate-800">
                    İşəgötürənlər üçün
                  </p>
                  <p className="text-[12px] text-slate-500">
                    Vakansiyanızı minlərlə istifadəçiyə çatdırın
                  </p>
                </div>
              </Link>
            </section>

            <footer className="flex flex-col items-center justify-between gap-2 border-t border-border py-4 text-[11px] text-slate-400 sm:flex-row">
              <p>© {new Date().getFullYear()} joblane.az. Bütün hüquqlar qorunur.</p>
              <p className="flex items-center gap-3">
                <span>{jobs.length} aktiv vakansiya</span>
                <span>•</span>
                <Link href="/about" className="hover:text-brand-500">Haqqımızda</Link>
                <Link href="/contact" className="hover:text-brand-500">Əlaqə</Link>
                <Link href="/privacy" className="hover:text-brand-500">Məxfilik</Link>
              </p>
            </footer>
          </div>
        </main>

        <RightRail
          ad={rightRailAd}
          featuredCompany={featuredCompany}
          trendingCategories={trendingCategories}
        />
        </div>
        </div>

        <SideSkin side="right" />
      </div>
    </div>
  )
}