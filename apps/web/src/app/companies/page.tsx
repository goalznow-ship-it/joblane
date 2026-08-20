"use client"

import { useState, useEffect } from "react"
import { Header } from "@/components/Header"
import { Footer } from "@/components/Footer"
import { CompanyCard, CompanyCardSkeleton } from "@/components/CompanyCard"
import { SectionHeaders } from "@/components/SectionHeader"
import { SearchBar } from "@/components/SearchBar"
import { activeApi } from "@/lib/api"
import type { Company, Industry } from "@joblane/contracts"
import { Search, Building2, Filter, X, AlertTriangle } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Checkbox } from "@/components/ui/checkbox"
import { Separator } from "@/components/ui/separator"

export default function CompaniesPage() {
  const [companies, setCompanies] = useState<Company[]>([])
  const [industries, setIndustries] = useState<Industry[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [filters, setFilters] = useState({
    keyword: "",
    location: "",
    industry: "",
    verified: false,
    page: 1,
    limit: 20,
  })
  const [showFilters, setShowFilters] = useState(false)
  const [activeFilterCount, setActiveFilterCount] = useState(0)

  useEffect(() => {
    activeApi.getIndustries().then(setIndustries).catch(() => setIndustries([]))
  }, [])

  const fetchCompanies = async () => {
    setLoading(true)
    setError(null)
    try {
      const response = await activeApi.getCompanies({
        keyword: filters.keyword,
        location: filters.location,
        industry: filters.industry,
        verified: filters.verified,
        page: filters.page,
        limit: filters.limit,
        sort: "jobs_desc",
      })
      setCompanies(response.data)
      setTotal(response.meta.total)
      setTotalPages(response.meta.totalPages)
    } catch (err) {
      console.error("Failed to fetch companies:", err)
      setError("Şirkət məlumatları yüklənə bilmədi. Zəhmət olmasa yenidən cəhd edin.")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchCompanies()
  }, [filters])

  const countActiveFilters = () => {
    let count = 0
    if (filters.keyword) count++
    if (filters.location) count++
    if (filters.industry) count++
    if (filters.verified) count++
    return count
  }

  useEffect(() => {
    setActiveFilterCount(countActiveFilters())
  }, [filters])

  const handleFilterChange = (key: keyof typeof filters, value: any) => {
    setFilters(prev => ({ ...prev, [key]: value, page: 1 }))
  }

  const clearFilters = () => {
    setFilters({
      keyword: "",
      location: "",
      industry: "",
      verified: false,
      page: 1,
      limit: 20,
    })
  }

  const hasActiveFilters = activeFilterCount > 0

  return (
    <div className="min-h-screen flex flex-col">
      <Header />

      <main className="flex-1">
        {/* Page Header */}
        <section className="bg-muted/30 border-b border-border/50 py-12 lg:py-16">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="max-w-3xl">
              <h1 className="text-3xl sm:text-4xl font-bold mb-2">Şirkətlər</h1>
              <p className="text-muted-foreground text-lg">
                Azərbaycanın öndə gələn şirkətlərini kəşf edin, onların aktiv vakansiyalarını araşdırın
              </p>
            </div>
          </div>
        </section>

        {/* Search & Filters */}
        <section className="py-8 border-b border-border/50">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="flex flex-col lg:flex-row gap-6">
              <div className="flex-1">
                <SearchBar
                  defaultKeyword={filters.keyword}
                  defaultLocation={filters.location}
                  onSearch={(keyword, location) => {
                    setFilters(prev => ({ ...prev, keyword, location, page: 1 }))
                  }}
                />
              </div>

              <div className="lg:hidden">
                <Button variant="outline" onClick={() => setShowFilters(true)} className="w-full gap-2">
                  <Filter className="h-4 w-4" aria-hidden="true" />
                  Filtrlər
                </Button>
              </div>
            </div>

            <div className="hidden lg:block lg:w-64">
              <div className="sticky top-24 space-y-6">
                <div>
                  <label className="block text-sm font-medium mb-2">İndustriya</label>
                  <Select value={filters.industry} onValueChange={(v: string) => handleFilterChange("industry", v)}>
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Bütün industriyalar" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="">Bütün industriyalar</SelectItem>
                      {industries.map(industry => (
                        <SelectItem key={industry.id} value={industry.slug}>
                          {industry.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <Separator />

                <div>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <Checkbox
                      checked={filters.verified}
                      onCheckedChange={checked => handleFilterChange("verified", checked)}
                    />
                    <span className="text-sm">Yalnız təsdiq edilmiş şirkətlər</span>
                  </label>
                </div>

                {activeFilterCount > 0 && (
                  <Button variant="outline" onClick={clearFilters} className="w-full mt-4">
                    <X className="mr-2 h-4 w-4" aria-hidden="true" />
                    Filtrləri təmizlə
                  </Button>
                )}
              </div>
            </div>
          </div>
        </section>

        {/* Results */}
        <section className="py-8">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium text-foreground">
                  {total} {total === 1 ? "şirkət tapıldı" : "şirkət tapıldı"}
                </span>
                {hasActiveFilters && (
                  <span className="bg-primary/10 text-primary text-xs px-2 py-0.5 rounded-full">
                    Filtrləndi
                  </span>
                )}
              </div>
            </div>

            {error && (
              <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-8 text-center">
                <AlertTriangle className="mx-auto h-8 w-8 text-amber-500" />
                <p className="mt-3 text-sm font-semibold text-amber-800">{error}</p>
                <Button variant="outline" onClick={fetchCompanies} className="mt-3">
                  Yenidən cəhd et
                </Button>
              </div>
            )}

            {loading ? (
              <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                {[1, 2, 3, 4, 5, 6, 7, 8].map(i => <CompanyCardSkeleton key={i} />)}
              </div>
            ) : companies.length === 0 ? (
              <div className="text-center py-16">
                <svg className="mx-auto h-16 w-16 text-muted-foreground/50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14m14 0h2m-2 0h-5m-9 0H3m2 0h5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                </svg>
                <h3 className="mt-4 text-lg font-medium text-foreground">Şirkət tapılmadı</h3>
                <p className="mt-2 text-muted-foreground">Filtrləmə meyarlarınızı dəyişib yenidən cəhd edin</p>
                <Button variant="outline" onClick={clearFilters} className="mt-4">
                  <X className="mr-2 h-4 w-4" aria-hidden="true" />
                  Filtrləri təmizlə
                </Button>
              </div>
            ) : (
              <>
                <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                  {companies.map(company => <CompanyCard key={company.id} company={company} />)}
                </div>

                {totalPages > 1 && (
                  <nav className="mt-10 flex items-center justify-center gap-2" aria-label="Səhifələmə">
                    <Button variant="outline" size="sm" onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1} aria-label="Əvvəlki səhifə">
                      <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
                    </Button>
                    {Array.from({ length: Math.min(totalPages, 5) }, (_, i) => i + 1).map(p => (
                      <Button key={p} variant={page === p ? "default" : "outline"} size="sm" onClick={() => setPage(p)} aria-label={`Səhifə ${p}`} aria-current={page === p ? "page" : undefined}>
                        {p}
                      </Button>
                    ))}
                    {totalPages > 5 && page < totalPages - 2 && <span className="px-2 text-muted-foreground">...</span>}
                    {totalPages > 5 && <Button key={totalPages} variant={page === totalPages ? "default" : "outline"} size="sm" onClick={() => setPage(totalPages)} aria-label={`Səhifə ${totalPages}`}>{totalPages}</Button>}
                    <Button variant="outline" size="sm" onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages} aria-label="Növbəti səhifə">
                      <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
                    </Button>
                  </nav>
                )}
              </>
            )}
          </div>
        </section>
      </main>

      <Footer />
    </div>
  )
}