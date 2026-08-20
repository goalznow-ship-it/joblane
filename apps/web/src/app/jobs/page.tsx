"use client"

import { Suspense, useCallback, useEffect, useMemo, useState } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import Link from "next/link"
import { AlertTriangle, ArrowRight, SearchX, Search } from "lucide-react"

import TopHeader from "@/components/marketplace/TopHeader"
import PortalSidebar from "@/components/marketplace/PortalSidebar"
import MarketplaceSearch from "@/components/marketplace/MarketplaceSearch"
import VacancyList from "@/components/marketplace/VacancyList"
import RightRail from "@/components/marketplace/RightRail"
import EmptyState from "@/components/marketplace/EmptyState"

import { activeApi } from "@/lib/api"
import type {
  Job,
  Category,
  Region,
  Company,
  JobFilters,
  EmploymentType,
  WorkMode,
  ExperienceLevel,
} from "@joblane/contracts"

function parsePage(value: string | null): number {
  const page = Number(value)
  return Number.isFinite(page) && page > 0 ? Math.floor(page) : 1
}

const SEARCH_KEYS = {
  keyword: "q",
  region: "region",
  category: "category",
  workMode: "work_mode",
  employmentType: "employment_type",
  experience: "experience_level",
  salaryMin: "salary_min",
  salaryMax: "salary_max",
} as const

export default function JobsPage() {
  return (
    <Suspense fallback={null}>
      <JobsContent />
    </Suspense>
  )
}

function JobsContent() {
  const router = useRouter()
  const searchParams = useSearchParams()

  const [jobs, setJobs] = useState<Job[]>([])
  const [categories, setCategories] = useState<Category[]>([])
  const [regions, setRegions] = useState<Region[]>([])
  const [companies, setCompanies] = useState<Company[]>([])
  const [total, setTotal] = useState(0)
  const [totalPages, setTotalPages] = useState(1)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [location, setLocation] = useState("")

  const page = parsePage(searchParams.get("page"))
  const sort = searchParams.get("sort") || "newest"

  const filters: JobFilters = useMemo(() => {
    const f: JobFilters = {}
    const q = searchParams.get("q")
    if (q) f.keyword = q
    const locationParam = searchParams.get("location")
    if (locationParam) f.location = locationParam
    const region = searchParams.get("region")
    if (region) f.region = region
    const category = searchParams.get("category")
    if (category) f.category = category
    const employmentType = searchParams.get("employment_type")
    if (employmentType) f.employmentType = [employmentType as EmploymentType]
    const workMode = searchParams.get("work_mode")
    if (workMode) f.workMode = [workMode as WorkMode]
    const experienceLevel = searchParams.get("experience_level")
    if (experienceLevel) f.experienceLevel = [experienceLevel as ExperienceLevel]
    const salaryMin = Number(searchParams.get("salary_min"))
    if (Number.isFinite(salaryMin) && salaryMin > 0) f.salaryMin = salaryMin
    const salaryMax = Number(searchParams.get("salary_max"))
    if (Number.isFinite(salaryMax) && salaryMax > 0) f.salaryMax = salaryMax
    if (sort === "salary_desc" || sort === "salary_asc") f.sort = sort
    return f
  }, [searchParams, sort])

  useEffect(() => {
    let cancelled = false
    activeApi.getCategories().then((cats) => !cancelled && setCategories(cats)).catch(() => {})
    activeApi.getRegions().then((regs) => !cancelled && setRegions(regs)).catch(() => {})
    activeApi.getCompanies({ limit: 5, sort: "jobs_desc" }).then((res) => !cancelled && setCompanies(res.data)).catch(() => {})
    return () => {
      cancelled = true
    }
  }, [])

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    setError(null)
    activeApi
      .getJobs({ ...filters, page, limit: 10 })
      .then((res) => {
        if (cancelled) return
        setJobs(res.data)
        setTotal(res.meta.total)
        setTotalPages(res.meta.totalPages)
      })
      .catch((err) => {
        if (cancelled) return
        console.error("Failed to fetch jobs:", err)
        setError("Vakansiyalar yüklənə bilmədi. Zəhmət olmasa yenidən cəhd edin.")
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [filters, page])

  const updateParams = useCallback(
    (patch: Record<string, string | null>) => {
      const params = new URLSearchParams(searchParams.toString())
      for (const [key, value] of Object.entries(patch)) {
        if (value === null || value === "") params.delete(key)
        else params.set(key, value)
      }
      router.replace(`/jobs${params.size > 0 ? `?${params.toString()}` : ""}`, { scroll: false })
    },
    [router, searchParams]
  )

  const handleSearch = (values: Record<string, string>) => {
    const patch: Record<string, string | null> = { page: null }
    for (const [key, param] of Object.entries(SEARCH_KEYS)) {
      const value = values[key]
      if (value) patch[param] = value
      else patch[param] = null
    }
    updateParams(patch)
  }

  const handleLocation = () => {
    updateParams({ location: location || null, page: null })
  }

  const hasActiveQuery = useMemo(() => {
    for (const key of searchParams.keys()) {
      if (key !== "page" && key !== "sort") return true
    }
    return false
  }, [searchParams])

  const pageNumbers = useMemo(() => {
    if (totalPages <= 5) return Array.from({ length: totalPages }, (_, i) => i + 1)
    const pages = new Set<number>([1, totalPages, page - 1, page, page + 1])
    return Array.from(pages)
      .filter((p) => p >= 1 && p <= totalPages)
      .sort((a, b) => a - b)
  }, [totalPages, page])

  const renderPageNumbers = (nums: number[]) => {
    const items: React.ReactNode[] = []
    let prev = 0
    for (const n of nums) {
      if (n - prev > 1) {
        items.push(
          <span key={`gap-${n}`} className="px-2 text-[12px] text-slate-400">
            ...
          </span>
        )
      }
      items.push(
        <button
          key={n}
          type="button"
          onClick={() => updateParams({ page: String(n) })}
          aria-current={n === page ? "page" : undefined}
          className={
            n === page
              ? "flex h-8 min-w-8 items-center justify-center rounded-lg bg-brand-500 px-2.5 text-[12.5px] font-semibold text-white"
              : "flex h-8 min-w-8 items-center justify-center rounded-lg border border-border bg-white px-2.5 text-[12.5px] font-semibold text-slate-600 transition-colors hover:border-brand-200 hover:bg-brand-50/60"
          }
        >
          {n}
        </button>
      )
      prev = n
    }
    return items
  }

  const featuredCompany = companies[0]

  return (
    <div className="min-h-screen bg-[#F5F7FB]">
      <TopHeader />

      <div className="grid w-full justify-center gap-6 min-[1400px]:grid-cols-[120px_minmax(0,1fr)_120px] min-[1800px]:grid-cols-[160px_minmax(0,1200px)_160px]">
        <div className="flex min-w-0 flex-col">
          <div className="mx-auto flex w-full max-w-[1600px] gap-5">
            <PortalSidebar />

            <main className="min-w-0 flex-1 px-4 py-4">
              <div className="mb-3 flex items-end justify-between">
                <div>
                  <h1 className="text-[24px] font-bold tracking-tight text-slate-900">Vakansiyalar</h1>
                  <p className="mt-0.5 text-[12.5px] text-slate-500">
                    Azərbaycanın aparıcı şirkətlərindən canlı iş elanları
                  </p>
                </div>
                <span className="mb-0.5 hidden rounded-lg border border-brand-100 bg-brand-50 px-3 py-1 text-[12px] font-semibold text-brand-600 sm:block">
                  {total} vakansiya
                </span>
              </div>

              <div className="space-y-6">
                <MarketplaceSearch onSearch={handleSearch} categories={categories} regions={regions} />

                <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                  <div className="flex flex-1 gap-2">
                    <input
                      value={location}
                      onChange={(e) => setLocation(e.target.value)}
                      onKeyDown={(e) => e.key === "Enter" && handleLocation()}
                      placeholder="Şəhər üzrə axtarış..."
                      className="h-10 w-full rounded-xl border border-border bg-white px-3.5 text-[13px] text-slate-800 outline-none transition-colors placeholder:text-slate-400 focus:border-brand-300 focus:ring-2 focus:ring-brand-100"
                    />
                    <button
                      type="button"
                      onClick={handleLocation}
                      className="flex h-10 items-center gap-1.5 rounded-xl bg-slate-900 px-3.5 text-[12.5px] font-semibold text-white transition-colors hover:bg-slate-700"
                    >
                      <Search className="h-3.5 w-3.5" />
                      Axtar
                    </button>
                  </div>
                  <select
                    value={sort}
                    onChange={(e) => updateParams({ sort: e.target.value || null, page: null })}
                    className="h-10 rounded-xl border border-border bg-white px-3 text-[12.5px] font-medium text-slate-700 outline-none focus:border-brand-300"
                  >
                    <option value="newest">Ən yeni</option>
                    <option value="salary_desc">Maaş: yüksəkdən aşağıya</option>
                    <option value="salary_asc">Maaş: aşağıdan yüksəyə</option>
                  </select>
                </div>

                {error && (
                  <section className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-6 text-center">
                    <AlertTriangle className="mx-auto h-8 w-8 text-amber-500" />
                    <p className="mt-3 text-[13.5px] font-semibold text-amber-800">{error}</p>
                    <button
                      type="button"
                      onClick={() => updateParams({})}
                      className="mt-3 rounded-lg bg-amber-500 px-4 py-2 text-[12.5px] font-semibold text-white transition-colors hover:bg-amber-600"
                    >
                      Yenidən cəhd et
                    </button>
                  </section>
                )}

                <section>
                  {loading ? (
                    <div className="space-y-2">
                      {[1, 2, 3, 4, 5].map((i) => (
                        <div
                          key={i}
                          className="h-28 animate-pulse rounded-xl border border-border bg-white"
                        />
                      ))}
                    </div>
                  ) : jobs.length > 0 ? (
                    <VacancyList jobs={jobs} />
                  ) : (
                    <EmptyState
                      icon={SearchX}
                      title="Vakansiya tapılmadı"
                      subtitle={
                        hasActiveQuery
                          ? "Axtarış şərtlərini dəyişib yenidən cəhd edin"
                          : "Hazırda aktiv vakansiya yoxdur"
                      }
                      className="rounded-xl border border-border bg-white"
                    />
                  )}
                </section>

                {!loading && totalPages > 1 && (
                  <nav
                    className="flex items-center justify-center gap-1.5 pt-1"
                    aria-label="Səhifələmə"
                  >
                    <button
                      type="button"
                      disabled={page <= 1}
                      onClick={() => updateParams({ page: String(Math.max(1, page - 1)) })}
                      aria-label="Əvvəlki səhifə"
                      className="flex h-8 min-w-8 items-center justify-center rounded-lg border border-border bg-white px-2.5 text-[12.5px] font-semibold text-slate-600 transition-colors hover:border-brand-200 disabled:cursor-not-allowed disabled:opacity-40"
                    >
                      ←
                    </button>
                    {renderPageNumbers(pageNumbers)}
                    <button
                      type="button"
                      disabled={page >= totalPages}
                      onClick={() => updateParams({ page: String(Math.min(totalPages, page + 1)) })}
                      aria-label="Növbəti səhifə"
                      className="flex h-8 min-w-8 items-center justify-center rounded-lg border border-border bg-white px-2.5 text-[12.5px] font-semibold text-slate-600 transition-colors hover:border-brand-200 disabled:cursor-not-allowed disabled:opacity-40"
                    >
                      →
                    </button>
                  </nav>
                )}

                <footer className="flex flex-col items-center justify-between gap-2 border-t border-border py-4 text-[11px] text-slate-400 sm:flex-row">
                  <p>© {new Date().getFullYear()} joblane.az. Bütün hüquqlar qorunur.</p>
                  <p className="flex items-center gap-3">
                    <span>{total} aktiv vakansiya</span>
                    <span>•</span>
                    <Link href="/about" className="hover:text-brand-500">Haqqımızda</Link>
                    <Link href="/contact" className="hover:text-brand-500">Əlaqə</Link>
                    <Link href="/privacy" className="hover:text-brand-500">Məxfilik</Link>
                  </p>
                </footer>
              </div>
            </main>

            <RightRail
              featuredCompany={featuredCompany}
              trendingCategories={categories.slice(0, 6)}
            />
          </div>
        </div>
      </div>
    </div>
  )
}