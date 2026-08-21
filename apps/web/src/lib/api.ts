// API Client for Joblane Frontend
//
// The REAL backend API is the default in both development and production.
// Fixture data is only used when NEXT_PUBLIC_USE_FIXTURES=true is set
// explicitly. There is no silent fallback to fixtures on backend errors —
// errors surface so they are noticed during development.
//
// Adapters convert the backend snake_case responses into the shared
// @joblane/contracts types exactly once, here, so page components do not
// duplicate mapping logic.

import type {
  Job,
  Company,
  Category,
  Industry,
  Region,
  JobFilters,
  CompanyFilters,
  PaginatedResponse,
  EmploymentType,
  WorkMode,
  ExperienceLevel,
} from "@joblane/contracts"

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8002"

// ---------------------------------------------------------------------------
// Backend response shapes (public marketplace API)
// ---------------------------------------------------------------------------

interface RawCompanySummary {
  id: string
  name: string
  slug: string
  logo_url?: string | null
  industry?: string | null
  verified?: boolean
}

interface RawJob {
  id: string
  slug: string
  title: string
  description?: string | null
  requirements?: string | null
  responsibilities?: string | null
  benefits?: string | null
  salary_min?: number | null
  salary_max?: number | null
  salary_currency?: string | null
  salary_visible?: boolean | null
  location?: string | null
  region_id?: string | null
  region_name?: string | null
  category_id?: string | null
  category_name?: string | null
  category_slug?: string | null
  industry?: string | null
  industry_id?: string | null
  industry_name?: string | null
  employment_type?: string | null
  work_mode?: string | null
  experience_level?: string | null
  education?: string | null
  application_deadline?: string | null
  publication_date?: string | null
  expiration_date?: string | null
  is_premium?: boolean
  is_featured?: boolean
  is_urgent?: boolean
  views?: number
  company: RawCompanySummary
  company_profile?: RawCompany
}

interface RawCompany {
  id: string
  name: string
  slug: string
  description?: string | null
  logo_url?: string | null
  cover_url?: string | null
  website?: string | null
  address?: string | null
  industry?: string | null
  industry_id?: string | null
  industry_name?: string | null
  verified?: boolean
  active_jobs_count?: number
  created_at?: string | null
  socials?: Record<string, string> | null
}

interface RawCategory {
  id: string
  name: string
  slug: string
  icon?: string | null
  description?: string | null
  active_jobs_count?: number
}

interface RawIndustry {
  id: string
  name: string
  slug: string
  description?: string | null
  active_jobs_count?: number
}

interface RawRegion {
  id: string
  name: string
  slug: string
  country?: string | null
  city?: string | null
  active_jobs_count?: number
}

interface RawMeta {
  total: number
  page: number
  limit: number
  totalPages: number
}

// ---------------------------------------------------------------------------
// Adapters (single source of truth for snake_case -> contracts mapping)
// ---------------------------------------------------------------------------

function splitLines(value?: string | null): string[] {
  if (!value) return []
  return value
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean)
}

function toEmploymentType(value?: string | null): EmploymentType {
  return (value?.toLowerCase() as EmploymentType) ?? "full_time"
}

function toWorkMode(value?: string | null): WorkMode {
  return (value?.toLowerCase() as WorkMode) ?? "on_site"
}

function toExperienceLevel(value?: string | null): ExperienceLevel {
  return (value?.toLowerCase() as ExperienceLevel) ?? "mid"
}

function companyFromRawSummary(raw: RawCompanySummary): Company {
  return {
    id: raw.id,
    name: raw.name,
    slug: raw.slug,
    logo: raw.logo_url || undefined,
    description: "",
    industry: raw.industry || "",
    verified: Boolean(raw.verified),
    openJobsCount: 0,
    createdAt: "",
  }
}

function jobFromRaw(raw: RawJob): Job {
  const profile = raw.company_profile
  return {
    id: raw.id,
    title: raw.title,
    slug: raw.slug,
    company: profile
      ? companyFromRaw(profile)
      : companyFromRawSummary(raw.company),
    location: raw.location || "",
    employmentType: toEmploymentType(raw.employment_type),
    workMode: toWorkMode(raw.work_mode),
    salaryMin: raw.salary_min ?? undefined,
    salaryMax: raw.salary_max ?? undefined,
    currency: raw.salary_currency || "AZN",
    description: raw.description || "",
    requirements: splitLines(raw.requirements),
    benefits: splitLines(raw.benefits),
    skills: [],
    experienceLevel: toExperienceLevel(raw.experience_level),
    publishedAt: raw.publication_date || "",
    expiresAt: raw.expiration_date || undefined,
    isFeatured: Boolean(raw.is_featured),
    isPremium: Boolean(raw.is_premium),
    isUrgent: Boolean(raw.is_urgent),
    categorySlug: raw.category_slug || undefined,
    views: raw.views || 0,
    applicationsCount: 0,
  }
}

function companyFromRaw(raw: RawCompany): Company {
  return {
    id: raw.id,
    name: raw.name,
    slug: raw.slug,
    logo: raw.logo_url || undefined,
    coverImage: raw.cover_url || undefined,
    description: raw.description || "",
    industry: raw.industry || raw.industry_name || "",
    location: raw.address || undefined,
    website: raw.website || undefined,
    verified: Boolean(raw.verified),
    openJobsCount: raw.active_jobs_count || 0,
    createdAt: raw.created_at || "",
  }
}

function categoryFromRaw(raw: RawCategory): Category {
  return {
    id: raw.id,
    name: raw.name,
    slug: raw.slug,
    icon: raw.icon || undefined,
    jobsCount: raw.active_jobs_count || 0,
  }
}

function industryFromRaw(raw: RawIndustry): Industry {
  return {
    id: raw.id,
    name: raw.name,
    slug: raw.slug,
    jobsCount: raw.active_jobs_count || 0,
  }
}

function regionFromRaw(raw: RawRegion): Region {
  return {
    id: raw.id,
    name: raw.name,
    slug: raw.slug,
    city: raw.city || undefined,
    jobsCount: raw.active_jobs_count || 0,
  }
}

// ---------------------------------------------------------------------------
// Query building
// ---------------------------------------------------------------------------

function buildJobParams(filters: JobFilters): URLSearchParams {
  const params = new URLSearchParams()
  const set = (key: string, value?: string | number | boolean) => {
    if (value !== undefined && value !== null && value !== "") {
      params.set(key, String(value))
    }
  }
  const first = (values?: string[]) => (values && values.length ? values[0] : undefined)

  set("q", filters.keyword)
  set("location", filters.location)
  set("region", filters.region)
  set("region_id", filters.regionId)
  set("category", filters.category)
  set("category_id", filters.categoryId)
  set("industry", filters.industry)
  set("industry_id", filters.industryId)
  set("employment_type", first(filters.employmentType))
  set("work_mode", first(filters.workMode))
  set("experience_level", first(filters.experienceLevel))
  set("salary_min", filters.salaryMin)
  set("salary_max", filters.salaryMax)
  set("premium", filters.premium)
  set("featured", filters.featured)
  set("urgent", filters.urgent)
  set("company", filters.company)
  set("company_id", filters.companyId)
  set("sort", filters.sort)
  set("page", filters.page)
  set("limit", filters.limit)
  return params
}

function buildCompanyParams(filters: CompanyFilters): URLSearchParams {
  const params = new URLSearchParams()
  const set = (key: string, value?: string | number | boolean) => {
    if (value !== undefined && value !== null && value !== "") {
      params.set(key, String(value))
    }
  }
  set("q", filters.keyword || filters.q)
  set("location", filters.location)
  set("industry", filters.industry)
  set("industry_id", filters.industryId)
  set("verified", filters.verified)
  set("sort", filters.sort)
  set("page", filters.page)
  set("limit", filters.limit)
  return params
}

async function getJson<T>(path: string): Promise<T> {
  const response = await fetch(`${API_BASE_URL}${path}`, { credentials: "include" })
  if (!response.ok) throw new Error(`API xətası (${response.status})`)
  return response.json()
}

// ---------------------------------------------------------------------------
// Real API client (default)
// ---------------------------------------------------------------------------

export const realApi = {
  async getJobs(filters: JobFilters = {}): Promise<PaginatedResponse<Job>> {
    const params = buildJobParams(filters)
    const body = await getJson<{ data: RawJob[]; meta: RawMeta }>(
      `/api/v1/jobs?${params.toString()}`
    )
    return {
      data: body.data.map(jobFromRaw),
      meta: body.meta,
    }
  },

  async getJob(slug: string): Promise<Job | null> {
    const response = await fetch(`${API_BASE_URL}/api/v1/jobs/${slug}`, {
      credentials: "include",
    })
    if (response.status === 404) return null
    if (!response.ok) throw new Error(`API xətası (${response.status})`)
    const body = (await response.json()) as RawJob
    return jobFromRaw(body)
  },

  async getRelatedJobs(slug: string, limit: number = 4): Promise<Job[]> {
    const body = await getJson<{ data: RawJob[] }>(
      `/api/v1/jobs/${slug}/related?limit=${limit}`
    )
    return body.data.map(jobFromRaw)
  },

  async getCompanies(filters: CompanyFilters = {}): Promise<PaginatedResponse<Company>> {
    const params = buildCompanyParams(filters)
    const body = await getJson<{ data: RawCompany[]; meta: RawMeta }>(
      `/api/v1/companies?${params.toString()}`
    )
    return {
      data: body.data.map(companyFromRaw),
      meta: body.meta,
    }
  },

  async getCompany(slug: string): Promise<Company | null> {
    const response = await fetch(`${API_BASE_URL}/api/v1/companies/${slug}`, {
      credentials: "include",
    })
    if (response.status === 404) return null
    if (!response.ok) throw new Error(`API xətası (${response.status})`)
    const body = (await response.json()) as RawCompany
    return companyFromRaw(body)
  },

  async getCompanyJobs(companyId: string, page: number = 1, limit: number = 20): Promise<PaginatedResponse<Job>> {
    return this.getJobs({ companyId, page, limit, sort: "newest" })
  },

  async getFeaturedCompanies(limit: number = 8): Promise<Company[]> {
    const body = await getJson<{ data: RawCompany[]; meta: RawMeta }>(
      `/api/v1/companies?limit=100&sort=jobs_desc`
    )
    return body.data
      .filter((c) => c.verified && (c.active_jobs_count || 0) > 0)
      .slice(0, limit)
      .map(companyFromRaw)
  },

  async getCategories(): Promise<Category[]> {
    const body = await getJson<{ data: RawCategory[] }>(
      `/api/v1/categories?limit=500`
    )
    return body.data.map(categoryFromRaw)
  },

  async getCategory(slug: string): Promise<Category | null> {
    const categories = await this.getCategories()
    return categories.find((c) => c.slug === slug) || null
  },

  async getIndustries(): Promise<Industry[]> {
    const body = await getJson<{ data: RawIndustry[] }>(
      `/api/v1/industries?limit=500`
    )
    return body.data.map(industryFromRaw)
  },

  async getRegions(): Promise<Region[]> {
    const body = await getJson<{ data: RawRegion[] }>(
      `/api/v1/regions?limit=500`
    )
    return body.data.map(regionFromRaw)
  },

  async getPremiumJobs(limit: number = 5): Promise<Job[]> {
    const result = await this.getJobs({ premium: true, limit })
    return result.data
  },

  async getFeaturedJobs(limit: number = 5): Promise<Job[]> {
    const result = await this.getJobs({ featured: true, limit })
    return result.data
  },

  async getLatestJobs(limit: number = 10): Promise<Job[]> {
    const result = await this.getJobs({ sort: "newest", limit })
    return result.data
  },

  async searchJobs(query: string, filters: JobFilters = {}): Promise<PaginatedResponse<Job>> {
    return this.getJobs({ ...filters, keyword: query })
  },

  async healthCheck(): Promise<{ status: string }> {
    return getJson<{ status: string }>("/api/v1/health/live")
  },
}

// ---------------------------------------------------------------------------
// Fixture API client (opt-in only: NEXT_PUBLIC_USE_FIXTURES=true)
// ---------------------------------------------------------------------------

const simulateDelay = (ms: number = 300) => new Promise(resolve => setTimeout(resolve, ms))

export const fixtureApi = {
  async getJobs(filters: JobFilters = {}): Promise<PaginatedResponse<Job>> {
    await simulateDelay()
    const { jobs } = await import("@/lib/fixtures/jobs")
    let filtered = [...jobs]
    if (filters.keyword) {
      const kw = filters.keyword.toLowerCase()
      filtered = filtered.filter((job) =>
        job.title.toLowerCase().includes(kw) ||
        job.company.name.toLowerCase().includes(kw) ||
        job.description.toLowerCase().includes(kw)
      )
    }
    if (filters.location) {
      const loc = filters.location.toLowerCase()
      filtered = filtered.filter((job) => job.location.toLowerCase().includes(loc))
    }
    if (filters.employmentType && filters.employmentType.length > 0) {
      filtered = filtered.filter((job) => filters.employmentType!.includes(job.employmentType))
    }
    if (filters.workMode && filters.workMode.length > 0) {
      filtered = filtered.filter((job) => filters.workMode!.includes(job.workMode))
    }
    if (filters.salaryMin !== undefined) {
      filtered = filtered.filter((job) => (job.salaryMax || job.salaryMin || 0) >= filters.salaryMin!)
    }
    if (filters.salaryMax !== undefined) {
      filtered = filtered.filter((job) => (job.salaryMin || job.salaryMax || 0) <= filters.salaryMax!)
    }
    switch (filters.sort) {
      case "salary_desc":
        filtered.sort((a, b) => (b.salaryMax || b.salaryMin || 0) - (a.salaryMax || a.salaryMin || 0))
        break
      case "salary_asc":
        filtered.sort((a, b) => (a.salaryMin || a.salaryMax || 0) - (b.salaryMin || b.salaryMax || 0))
        break
      default:
        filtered.sort((a, b) => new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime())
    }
    const page = filters.page || 1
    const limit = filters.limit || 20
    return {
      data: filtered.slice((page - 1) * limit, page * limit),
      meta: {
        total: filtered.length,
        page,
        limit,
        totalPages: Math.ceil(filtered.length / limit),
      },
    }
  },

  async getJob(slug: string): Promise<Job | null> {
    await simulateDelay()
    const { jobs } = await import("@/lib/fixtures/jobs")
    return jobs.find((job) => job.slug === slug) || null
  },

  async getRelatedJobs(slug: string, limit: number = 4): Promise<Job[]> {
    await simulateDelay()
    const { jobs } = await import("@/lib/fixtures/jobs")
    const job = jobs.find((j) => j.slug === slug)
    if (!job) return []
    return jobs.filter((j) => j.slug !== slug && j.company.id === job.company.id).slice(0, limit)
  },

  async getCompanies(filters: CompanyFilters = {}): Promise<PaginatedResponse<Company>> {
    await simulateDelay()
    const { companies } = await import("@/lib/fixtures/companies")
    const page = filters.page || 1
    const limit = filters.limit || 20
    return {
      data: companies.slice((page - 1) * limit, page * limit),
      meta: {
        total: companies.length,
        page,
        limit,
        totalPages: Math.ceil(companies.length / limit),
      },
    }
  },

  async getCompany(slug: string): Promise<Company | null> {
    await simulateDelay()
    const { companies } = await import("@/lib/fixtures/companies")
    return companies.find((c) => c.slug === slug) || null
  },

  async getCompanyJobs(companyId: string, page: number = 1, limit: number = 20): Promise<PaginatedResponse<Job>> {
    await simulateDelay()
    const { jobs } = await import("@/lib/fixtures/jobs")
    const filtered = jobs.filter((job) => job.company.id === companyId)
    return {
      data: filtered.slice((page - 1) * limit, page * limit),
      meta: {
        total: filtered.length,
        page,
        limit,
        totalPages: Math.ceil(filtered.length / limit),
      },
    }
  },

  async getFeaturedCompanies(limit: number = 8): Promise<Company[]> {
    await simulateDelay()
    const { companies } = await import("@/lib/fixtures/companies")
    return companies.filter((c) => c.verified && c.openJobsCount > 0).slice(0, limit)
  },

  async getCategories(): Promise<Category[]> {
    await simulateDelay()
    const { categories } = await import("@/lib/fixtures/categories")
    return categories
  },

  async getCategory(slug: string): Promise<Category | null> {
    const categories = await this.getCategories()
    return categories.find((c) => c.slug === slug) || null
  },

  async getIndustries(): Promise<Industry[]> {
    await simulateDelay()
    return []
  },

  async getRegions(): Promise<Region[]> {
    await simulateDelay()
    return []
  },

  async getPremiumJobs(limit: number = 5): Promise<Job[]> {
    await simulateDelay()
    const { jobs } = await import("@/lib/fixtures/jobs")
    return jobs.filter((job) => job.isPremium).slice(0, limit)
  },

  async getFeaturedJobs(limit: number = 5): Promise<Job[]> {
    await simulateDelay()
    const { jobs } = await import("@/lib/fixtures/jobs")
    return jobs.filter((job) => job.isFeatured).slice(0, limit)
  },

  async getLatestJobs(limit: number = 10): Promise<Job[]> {
    const result = await this.getJobs({ limit })
    return result.data
  },

  async searchJobs(query: string, filters: JobFilters = {}): Promise<PaginatedResponse<Job>> {
    return this.getJobs({ ...filters, keyword: query })
  },

  async healthCheck(): Promise<{ status: string }> {
    await simulateDelay(50)
    return { status: "ok" }
  },
}

// ---------------------------------------------------------------------------
// Active client selection
// ---------------------------------------------------------------------------

// Default: real backend API. Fixtures ONLY when explicitly enabled.
const useFixtures = process.env.NEXT_PUBLIC_USE_FIXTURES === "true"

export const activeApi = useFixtures ? fixtureApi : realApi

export class ApiError extends Error {
  status: number
  detail: unknown

  constructor(status: number, detail: unknown) {
    super(typeof detail === "string" ? detail : "Xəta baş verdi")
    this.status = status
    this.detail = detail
  }
}

function getCsrfToken(): string {
  const match = document.cookie.match(/(?:^|; )csrf_token=([^;]+)/)
  return match ? decodeURIComponent(match[1]) : ""
}

export interface PublicMe {
  id: string
  email: string
  email_verified: boolean
  status: string
  created_at: string
}

export const authApi = {
  async register(email: string, password: string, onboardingIntent?: string): Promise<{ message: string; email_verified: boolean }> {
    const res = await fetch(`${API_BASE_URL}/api/v1/auth/register`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email: email.trim(),
        password,
        ...(onboardingIntent ? { onboarding_intent: onboardingIntent } : {}),
      }),
      credentials: "include",
    })
    if (!res.ok) {
      let detail: unknown = `HTTP ${res.status}`
      try {
        const body = await res.json()
        detail = body.detail ?? body.message ?? detail
      } catch {}
      throw new ApiError(res.status, detail)
    }
    return res.json()
  },

  async verifyEmail(token: string): Promise<{ success: boolean; message: string }> {
    const res = await fetch(`${API_BASE_URL}/api/v1/auth/verify-email`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token }),
      credentials: "include",
    })
    if (!res.ok) {
      let detail: unknown = `HTTP ${res.status}`
      try {
        const body = await res.json()
        detail = body.detail ?? body.message ?? detail
      } catch {}
      throw new ApiError(res.status, detail)
    }
    return res.json()
  },

  async resendVerification(email: string): Promise<{ message: string }> {
    const res = await fetch(`${API_BASE_URL}/api/v1/auth/resend-verification`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: email.trim() }),
      credentials: "include",
    })
    if (!res.ok) {
      let detail: unknown = `HTTP ${res.status}`
      try {
        const body = await res.json()
        detail = body.detail ?? body.message ?? detail
      } catch {}
      throw new ApiError(res.status, detail)
    }
    return res.json()
  },

  async login(email: string, password: string): Promise<void> {
    const res = await fetch(`${API_BASE_URL}/api/v1/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: email.trim(), password }),
      credentials: "include",
    })
    if (!res.ok) {
      let detail: unknown = `HTTP ${res.status}`
      try {
        const body = await res.json()
        detail = body.detail ?? body.message ?? detail
      } catch {
        // keep default detail
      }
      throw new ApiError(res.status, detail)
    }
  },

  async me(): Promise<PublicMe> {
    const res = await fetch(`${API_BASE_URL}/api/v1/auth/me`, { credentials: "include" })
    if (res.status === 401) throw new ApiError(401, "Not authenticated")
    if (!res.ok) throw new ApiError(res.status, "Failed to fetch session")
    return res.json()
  },

  async logout(): Promise<void> {
    const headers: Record<string, string> = {}
    const token = getCsrfToken()
    if (token) headers["X-CSRF-Token"] = token
    const res = await fetch(`${API_BASE_URL}/api/v1/auth/logout`, {
      method: "POST",
      headers,
      credentials: "include",
    })
    if (!res.ok) {
      let detail: unknown = `HTTP ${res.status}`
      try {
        const body = await res.json()
        detail = body.detail ?? body.message ?? detail
      } catch {
        // keep default detail
      }
      throw new ApiError(res.status, detail)
    }
  },

  async logoutAll(): Promise<void> {
    const headers: Record<string, string> = {}
    const token = getCsrfToken()
    if (token) headers["X-CSRF-Token"] = token
    const res = await fetch(`${API_BASE_URL}/api/v1/auth/logout-all`, {
      method: "POST",
      headers,
      credentials: "include",
    })
    if (!res.ok) {
      let detail: unknown = `HTTP ${res.status}`
      try {
        const body = await res.json()
        detail = body.detail ?? body.message ?? detail
      } catch {}
      throw new ApiError(res.status, detail)
    }
  },

  async forgotPassword(email: string): Promise<{ message: string }> {
    const res = await fetch(`${API_BASE_URL}/api/v1/auth/forgot-password`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: email.trim() }),
      credentials: "include",
    })
    if (!res.ok) {
      let detail: unknown = `HTTP ${res.status}`
      try {
        const body = await res.json()
        detail = body.detail ?? body.message ?? detail
      } catch {}
      throw new ApiError(res.status, detail)
    }
    return res.json()
  },

  async resetPassword(token: string, newPassword: string): Promise<{ message: string }> {
    const res = await fetch(`${API_BASE_URL}/api/v1/auth/reset-password`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token, new_password: newPassword }),
      credentials: "include",
    })
    if (!res.ok) {
      let detail: unknown = `HTTP ${res.status}`
      try {
        const body = await res.json()
        detail = body.detail ?? body.message ?? detail
      } catch {}
      throw new ApiError(res.status, detail)
    }
    return res.json()
  },

  async changePassword(currentPassword: string, newPassword: string): Promise<{ message: string }> {
    const headers: Record<string, string> = { "Content-Type": "application/json" }
    const token = getCsrfToken()
    if (token) headers["X-CSRF-Token"] = token
    const res = await fetch(`${API_BASE_URL}/api/v1/account/change-password`, {
      method: "POST",
      headers,
      body: JSON.stringify({ current_password: currentPassword, new_password: newPassword }),
      credentials: "include",
    })
    if (!res.ok) {
      let detail: unknown = `HTTP ${res.status}`
      try {
        const body = await res.json()
        detail = body.detail ?? body.message ?? detail
      } catch {}
      throw new ApiError(res.status, detail)
    }
    return res.json()
  },
}

// ---------------------------------------------------------------------------
// Notification API
// ---------------------------------------------------------------------------

export interface Notification {
  id: string
  type: string
  title: string
  message: string | null
  entity_type: string | null
  entity_id: string | null
  action_url: string | null
  metadata: Record<string, unknown> | null
  read_at: string | null
  created_at: string
  is_read: boolean
}

export interface NotificationListResponse {
  items: Notification[]
  total: number
  unread_count: number
  page: number
  page_size: number
}

export const notificationApi = {
  async list(page: number = 1, pageSize: number = 20): Promise<NotificationListResponse> {
    const res = await fetch(
      `${API_BASE_URL}/api/v1/notifications?page=${page}&page_size=${pageSize}`,
      { credentials: "include" }
    )
    if (res.status === 401) throw new ApiError(401, "Not authenticated")
    if (!res.ok) throw new ApiError(res.status, "Failed to fetch notifications")
    return res.json()
  },

  async unreadCount(): Promise<number> {
    const res = await fetch(`${API_BASE_URL}/api/v1/notifications/unread-count`, {
      credentials: "include",
    })
    if (res.status === 401) return 0
    if (!res.ok) return 0
    const body = await res.json()
    return body.unread_count
  },

  async markRead(id: string): Promise<{ success: boolean; unread_count: number }> {
    const headers: Record<string, string> = {}
    const token = getCsrfToken()
    if (token) headers["X-CSRF-Token"] = token
    const res = await fetch(`${API_BASE_URL}/api/v1/notifications/${id}/read`, {
      method: "POST",
      headers,
      credentials: "include",
    })
    if (!res.ok) throw new ApiError(res.status, "Failed to mark notification as read")
    return res.json()
  },

  async markAllRead(): Promise<{ success: boolean; unread_count: number }> {
    const headers: Record<string, string> = {}
    const token = getCsrfToken()
    if (token) headers["X-CSRF-Token"] = token
    const res = await fetch(`${API_BASE_URL}/api/v1/notifications/read-all`, {
      method: "POST",
      headers,
      credentials: "include",
    })
    if (!res.ok) throw new ApiError(res.status, "Failed to mark all notifications as read")
    return res.json()
  },
}

// ---------------------------------------------------------------------------
// Report & Blocklist API
// ---------------------------------------------------------------------------

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const method = (options.method || "GET").toUpperCase()
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(options.headers as Record<string, string>),
  }

  if (method !== "GET" && method !== "HEAD") {
    const token = getCsrfToken()
    if (token) headers["X-CSRF-Token"] = token
  }

  const res = await fetch(`${API_BASE_URL}${path}`, {
    ...options,
    method,
    headers,
    credentials: "include",
  })

  if (!res.ok) {
    let detail: unknown = `HTTP ${res.status}`
    try {
      const body = await res.json()
      detail = body.detail ?? body.message ?? detail
    } catch {
      // keep default detail
    }
    throw new ApiError(res.status, detail)
  }

  if (res.status === 204) return undefined as T
  return res.json()
}

export interface Report {
  id: string
  target_type: string
  target_id: string
  reason: string
  reason_label?: string
  description?: string | null
  status: string
  priority?: string
  target_snapshot?: Record<string, unknown> | null
  assigned_to?: string | null
  resolved_by?: string | null
  resolved_at?: string | null
  resolution?: string | null
  resolution_note?: string | null
  reporter_message?: string | null
  duplicate_of?: string | null
  source?: string | null
  created_at: string
  updated_at?: string | null
}

export interface ReportListItem {
  id: string
  target_type: string
  target_id: string
  reason: string
  reason_label?: string
  status: string
  priority?: string
  target_snapshot?: Record<string, unknown> | null
  created_at: string
}

export interface ReportListResponse {
  items: ReportListItem[]
  total: number
  page: number
  limit: number
  total_pages: number
}

export interface ReportHistoryEntry {
  id: string
  actor_id?: string | null
  from_status?: string | null
  to_status?: string | null
  action: string
  note?: string | null
  created_at: string
}

export interface BlocklistEntry {
  id: string
  type: string
  value_normalized: string
  reason?: string | null
  status: string
  created_at: string
  expires_at?: string | null
  note?: string | null
}

export const REPORT_REASON_LABELS: Record<string, string> = {
  SPAM: "Spam",
  SCAM: "Dələduzluq şübhəsi",
  FRAUD: "Dələduzluq",
  MISLEADING_INFORMATION: "Yanlış/misleading məlumat",
  DISCRIMINATORY_CONTENT: "Diskriminativ məzmun",
  INAPPROPRIATE_CONTENT: "Uyğunsuz məzmun",
  DUPLICATE_LISTING: "Təkrar elan",
  EXPIRED_OR_INVALID: "Elan etibarsızdır",
  FAKE_COMPANY: "Sahte şirkət",
  SUSPICIOUS_CONTACT: "Şübhəli əlaqə məlumatı",
  OTHER: "Digər",
}

export const REPORT_STATUS_LABELS: Record<string, string> = {
  OPEN: "Açıq",
  UNDER_REVIEW: "Baxılır",
  ACTION_REQUIRED: "Tələb olunur",
  RESOLVED: "Həll edilib",
  DISMISSED: "Rədd edilib",
  DUPLICATE: "Təkrar",
}

export const REPORT_PRIORITY_LABELS: Record<string, string> = {
  LOW: "Aşağı",
  NORMAL: "Normal",
  HIGH: "Yüksək",
  CRITICAL: "Kritik",
}

export const REPORT_RESOLUTION_LABELS: Record<string, string> = {
  NO_VIOLATION: "Pozuntu yoxdur",
  CONTENT_REMOVED: "Məzmun silindi",
  CONTENT_PAUSED: "Məzmun dayandırıldı",
  COMPANY_ACTION_TAKEN: "Şirkətə qarşı tədbir görüldü",
  USER_ACTION_TAKEN: "İstifadəçiyə qarşı tədbir görüldü",
  WARNING_ISSUED: "Xəbərdarlıq verildi",
  OTHER: "Digər",
}

export const reportApi = {
  create: (targetType: string, targetId: string, reason: string, description?: string) =>
    request<{ id: string; status: string }>("/api/v1/reports", {
      method: "POST",
      body: JSON.stringify({ target_type: targetType, target_id: targetId, reason, description }),
    }),

  listMy: (params?: { status?: string; target_type?: string; page?: number; limit?: number }) => {
    const qs = new URLSearchParams()
    if (params?.status) qs.set("status", params.status)
    if (params?.target_type) qs.set("target_type", params.target_type)
    if (params?.page) qs.set("page", String(params.page))
    if (params?.limit) qs.set("limit", String(params.limit))
    const q = qs.toString()
    return request<ReportListResponse>(`/api/v1/reports/mine${q ? "?" + q : ""}`)
  },

  getMy: (id: string) => request<Report>(`/api/v1/reports/${id}`),
}

export const adminReportApi = {
  list: (params?: Record<string, string | number | undefined>) => {
    const qs = new URLSearchParams()
    if (params) {
      Object.entries(params).forEach(([k, v]) => {
        if (v !== undefined && v !== null && v !== "") qs.set(k, String(v))
      })
    }
    const q = qs.toString()
    return request<ReportListResponse>(`/api/v1/admin/reports${q ? "?" + q : ""}`)
  },

  get: (id: string) => request<Report & { history?: ReportHistoryEntry[]; related_reports_count?: number }>(`/api/v1/admin/reports/${id}`),

  assign: (id: string, assigneeId?: string) =>
    request<Report>(`/api/v1/admin/reports/${id}/assign`, {
      method: "POST",
      body: JSON.stringify({ assignee_id: assigneeId || null }),
    }),

  changePriority: (id: string, priority: string) =>
    request<Report>(`/api/v1/admin/reports/${id}/priority`, {
      method: "PATCH",
      body: JSON.stringify({ priority }),
    }),

  markDuplicate: (id: string, duplicateOfId: string) =>
    request<Report>(`/api/v1/admin/reports/${id}/duplicate`, {
      method: "POST",
      body: JSON.stringify({ duplicate_of_report_id: duplicateOfId }),
    }),

  dismiss: (id: string, resolutionNote?: string) =>
    request<Report>(`/api/v1/admin/reports/${id}/dismiss`, {
      method: "POST",
      body: JSON.stringify({ resolution_note: resolutionNote }),
    }),

  confirm: (id: string) =>
    request<Report>(`/api/v1/admin/reports/${id}/confirm`, { method: "POST" }),

  resolve: (id: string, resolution: string, resolutionNote?: string, reporterMessage?: string) =>
    request<Report>(`/api/v1/admin/reports/${id}/resolve`, {
      method: "POST",
      body: JSON.stringify({ resolution, resolution_note: resolutionNote, reporter_message: reporterMessage }),
    }),

  jobAction: (id: string, action: string, reason?: string, note?: string) =>
    request<Report>(`/api/v1/admin/reports/${id}/actions/job`, {
      method: "POST",
      body: JSON.stringify({ action, reason, note }),
    }),

  companyAction: (id: string, action: string, reason?: string, note?: string) =>
    request<Report>(`/api/v1/admin/reports/${id}/actions/company`, {
      method: "POST",
      body: JSON.stringify({ action, reason, note }),
    }),
}

export const adminBlocklistApi = {
  list: (params?: { type?: string; status?: string; page?: number; limit?: number }) => {
    const qs = new URLSearchParams()
    if (params?.type) qs.set("type", params.type)
    if (params?.status) qs.set("status", params.status)
    if (params?.page) qs.set("page", String(params.page))
    if (params?.limit) qs.set("limit", String(params.limit))
    const q = qs.toString()
    return request<{ items: BlocklistEntry[]; total: number; page: number; limit: number; total_pages: number }>(
      `/api/v1/admin/blocklist${q ? "?" + q : ""}`
    )
  },

  create: (type: string, value: string, reason?: string, note?: string) =>
    request<BlocklistEntry>("/api/v1/admin/blocklist", {
      method: "POST",
      body: JSON.stringify({ type, value, reason, note }),
    }),

  deactivate: (id: string) =>
    request<BlocklistEntry>(`/api/v1/admin/blocklist/${id}`, { method: "DELETE" }),
}