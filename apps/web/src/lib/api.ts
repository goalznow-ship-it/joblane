// API Client for Joblane Frontend
// This file provides a clean interface to communicate with the backend API
// Currently uses development fixtures - will be replaced with real API calls

import type { Job, Company, Category, JobFilters, PaginatedResponse } from "@joblane/contracts"
import { jobs } from "@/lib/fixtures/jobs"
import { companies } from "@/lib/fixtures/companies"
import { categories } from "@/lib/fixtures/categories"

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8002"

// Simulate API delay for realistic UX
const simulateDelay = (ms: number = 300) => new Promise(resolve => setTimeout(resolve, ms))

// Helper to filter jobs locally (dev only)
function filterJobsLocally(filters: JobFilters): Job[] {
  let filtered = [...jobs]

  if (filters.keyword) {
    const kw = filters.keyword.toLowerCase()
    filtered = filtered.filter(job =>
      job.title.toLowerCase().includes(kw) ||
      job.company.name.toLowerCase().includes(kw) ||
      job.description.toLowerCase().includes(kw) ||
      job.skills.some(s => s.toLowerCase().includes(kw))
    )
  }

  if (filters.location) {
    const loc = filters.location.toLowerCase()
    filtered = filtered.filter(job => job.location.toLowerCase().includes(loc))
  }

  if (filters.category) {
    // In real implementation, this would filter by category
  }

  if (filters.employmentType && filters.employmentType.length > 0) {
    filtered = filtered.filter(job => filters.employmentType!.includes(job.employmentType))
  }

  if (filters.workMode && filters.workMode.length > 0) {
    filtered = filtered.filter(job => filters.workMode!.includes(job.workMode))
  }

  if (filters.experienceLevel && filters.experienceLevel.length > 0) {
    filtered = filtered.filter(job => filters.experienceLevel!.includes(job.experienceLevel))
  }

  if (filters.salaryMin !== undefined) {
    filtered = filtered.filter(job => (job.salaryMax || job.salaryMin || 0) >= filters.salaryMin!)
  }

  if (filters.salaryMax !== undefined) {
    filtered = filtered.filter(job => (job.salaryMin || job.salaryMax || 0) <= filters.salaryMax!)
  }

  // Sorting
  switch (filters.sort) {
    case "salary_desc":
      filtered.sort((a, b) => (b.salaryMax || b.salaryMin || 0) - (a.salaryMax || a.salaryMin || 0))
      break
    case "salary_asc":
      filtered.sort((a, b) => (a.salaryMin || a.salaryMax || 0) - (b.salaryMin || b.salaryMax || 0))
      break
    case "newest":
    default:
      filtered.sort((a, b) => new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime())
      break
  }

  return filtered
}

export const api = {
  async getJobs(filters: JobFilters = {}): Promise<PaginatedResponse<Job>> {
    await simulateDelay()

    const filtered = filterJobsLocally(filters)
    const page = filters.page || 1
    const limit = filters.limit || 20
    const start = (page - 1) * limit
    const end = start + limit
    const data = filtered.slice(start, end)

    return {
      data,
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
    return jobs.find(job => job.slug === slug) || null
  },

  async getFeaturedJobs(limit: number = 5): Promise<Job[]> {
    await simulateDelay()
    return jobs.filter(job => job.isFeatured).slice(0, limit)
  },

  async getLatestJobs(limit: number = 10): Promise<Job[]> {
    await simulateDelay()
    return [...jobs]
      .sort((a, b) => new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime())
      .slice(0, limit)
  },

  async getRelatedJobs(jobId: string, limit: number = 4): Promise<Job[]> {
    await simulateDelay()
    const job = jobs.find(j => j.id === jobId)
    if (!job) return []
    return jobs
        .filter(j => j.id !== jobId && j.company.id === job.company.id)
      .slice(0, limit)
  },

  async getCompanies(page: number = 1, limit: number = 20): Promise<PaginatedResponse<any>> {
    await simulateDelay()
    const start = (page - 1) * limit
    const end = start + limit
    return {
      data: companies.slice(start, end),
      meta: {
        total: companies.length,
        page,
        limit,
        totalPages: Math.ceil(companies.length / limit),
      },
    }
  },

  async getCompany(slug: string): Promise<any | null> {
    await simulateDelay()
    return companies.find(company => company.slug === slug) || null
  },

  async getCompanyJobs(companyId: string, page: number = 1, limit: number = 20): Promise<PaginatedResponse<Job>> {
    await simulateDelay()
    const filtered = jobs.filter(job => job.company.id === companyId)
    const start = (page - 1) * limit
    const end = start + limit
    return {
      data: filtered.slice(start, end),
      meta: {
        total: filtered.length,
        page,
        limit,
        totalPages: Math.ceil(filtered.length / limit),
      },
    }
  },

  async getFeaturedCompanies(limit: number = 8): Promise<any[]> {
    await simulateDelay()
    return companies.filter(c => c.verified && c.openJobsCount > 0).slice(0, limit)
  },

  async getCategories(): Promise<any[]> {
    await simulateDelay()
    return categories
  },

  async getCategory(slug: string): Promise<any | null> {
    await simulateDelay()
    return categories.find(c => c.slug === slug) || null
  },

  async searchJobs(query: string, filters: JobFilters = {}): Promise<PaginatedResponse<Job>> {
    return this.getJobs({ ...filters, keyword: query })
  },

  async healthCheck(): Promise<{ status: string }> {
    await simulateDelay(50)
    return { status: "ok" }
  },
}

// Real API functions (to be used when backend is ready)
export const realApi = {
  async getJobs(filters: JobFilters = {}): Promise<any> {
    const params = new URLSearchParams()
    Object.entries(filters).forEach(([key, value]) => {
      if (value !== undefined && value !== null) {
        if (Array.isArray(value)) {
          value.forEach(v => params.append(key, v))
        } else {
          params.append(key, String(value))
        }
      }
    })
    const response = await fetch(`${API_BASE_URL}/api/v1/jobs?${params.toString()}`)
    if (!response.ok) throw new Error("Failed to fetch jobs")
    return response.json()
  },

  async getJob(slug: string): Promise<any | null> {
    const response = await fetch(`${API_BASE_URL}/api/v1/jobs/${slug}`)
    if (response.status === 404) return null
    if (!response.ok) throw new Error("Failed to fetch job")
    return response.json()
  },

  async getCompanies(page: number = 1, limit: number = 20): Promise<any> {
    const response = await fetch(`${API_BASE_URL}/api/v1/companies?page=${page}&limit=${limit}`)
    if (!response.ok) throw new Error("Failed to fetch companies")
    return response.json()
  },

  async getCompany(slug: string): Promise<any | null> {
    const response = await fetch(`${API_BASE_URL}/api/v1/companies/${slug}`)
    if (response.status === 404) return null
    if (!response.ok) throw new Error("Failed to fetch company")
    return response.json()
  },

  async getCategories(): Promise<any[]> {
    const response = await fetch(`${API_BASE_URL}/api/v1/categories`)
    if (!response.ok) throw new Error("Failed to fetch categories")
    return response.json()
  },
}

// Export the active API (dev uses fixtures, prod will use realApi)
export const activeApi = process.env.NODE_ENV === "production" ? realApi : api

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
}