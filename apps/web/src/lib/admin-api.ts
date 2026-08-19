const ADMIN_API_BASE = process.env.NEXT_PUBLIC_ADMIN_API_URL || "http://localhost:8002"

export class AdminApiError extends Error {
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

  const res = await fetch(`${ADMIN_API_BASE}/api/v1${path}`, {
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
    throw new AdminApiError(res.status, detail)
  }

  if (res.status === 204) return undefined as T
  return res.json()
}

// Upload helper
async function uploadFile(file: File, path: string): Promise<{ url: string; file_size: number; mime_type: string; width?: number; height?: number }> {
  const formData = new FormData()
  formData.append("file", file)

  const token = getCsrfToken()
  const headers: Record<string, string> = {}
  if (token) headers["X-CSRF-Token"] = token

  const res = await fetch(`${ADMIN_API_BASE}/api/v1${path}`, {
    method: "POST",
    headers,
    body: formData,
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
    throw new AdminApiError(res.status, detail)
  }
  return res.json()
}

export interface AdminMe {
  id: string
  email: string
  full_name: string | null
  role: string
  permissions: string[]
}

export interface AdminJob {
  id: string
  company_id: string
  title: string
  slug: string
  description: string | null
  requirements: string | null
  salary_min: number | null
  salary_max: number | null
  salary_currency: string | null
  salary_period: string | null
  location: string | null
  region_id: string | null
  category_id: string | null
  industry: string | null
  employment_type: string | null
  work_mode: string | null
  experience_level: string | null
  status: string
  moderation_reason: string | null
  moderation_note: string | null
  is_premium: boolean
  premium_since: string | null
  premium_until: string | null
  is_featured: boolean
  featured_since: string | null
  featured_until: string | null
  is_urgent: boolean
  urgent_until: string | null
  boost_priority: number | null
  views: number
  applications_count: number
  favorites_count: number
  created_at: string
  updated_at: string
  company_name?: string | null
  category_name?: string | null
  region_name?: string | null
  moderation_history?: ModerationHistoryItem[]
}

export interface ModerationHistoryItem {
  id: string
  from_status: string | null
  to_status: string
  actor_email: string
  reason: string | null
  note: string | null
  created_at: string
}

export interface CompanyModerationHistoryItem extends ModerationHistoryItem {}

export interface JobModerationHistoryItem extends ModerationHistoryItem {}

export interface AdModerationHistoryItem extends ModerationHistoryItem {}

export interface InternshipModerationHistoryItem extends ModerationHistoryItem {}

export interface TrainingModerationHistoryItem extends ModerationHistoryItem {}

export interface JobListResponse {
  items: AdminJob[]
  total: number
  page: number
  limit: number
  total_pages: number
}

export interface AuditEntry {
  id: string
  action: string
  entity_type: string
  entity_id: string | null
  actor_email: string | null
  before: unknown
  after: unknown
  ip_address: string | null
  user_agent: string | null
  created_at: string
}

export interface DashboardData {
  jobs: { by_status: Record<string, number>; total: number; premium: number; featured: number; urgent: number }
  companies: { by_status: Record<string, number>; total: number }
  users: { total: number; new_today: number; suspended: number; admins: number }
  applications: Record<string, number>
  ads: { by_status: Record<string, number>; total: number }
  finance: Record<string, number>
  moderation_queue: AdminJob[]
  recent_audit: AuditEntry[]
  system_status: Record<string, unknown>
}

// Companies
export interface AdminCompany {
  id: string
  name: string
  slug: string
  description: string | null
  website: string | null
  email: string | null
  phone: string | null
  address: string | null
  socials: Record<string, unknown> | null
  industry: string | null
  industry_id: string | null
  industry_name: string | null
  logo_url: string | null
  cover_url: string | null
  status: string
  verified_at: string | null
  verified_by: string | null
  verification_notes: string | null
  featured_until: string | null
  featured_priority: number
  active_jobs_count: number | null
  total_jobs_count: number | null
  created_at: string | null
  updated_at: string | null
  moderation_history: CompanyModerationHistoryItem[]
}

export interface CompanyDetailOut extends AdminCompany {
}

export interface CompanyListResponse {
  items: AdminCompany[]
  total: number
  page: number
  limit: number
  total_pages: number
}

export interface CompanyCreateRequest {
  name: string
  slug: string
  description?: string
  website?: string
  email?: string
  phone?: string
  address?: string
  socials?: Record<string, unknown>
  industry_id?: string
  logo_url?: string
  cover_url?: string
  status?: "PENDING" | "VERIFIED" | "ACTIVE" | "SUSPENDED" | "REJECTED" | "ARCHIVED"
}

export interface CompanyUpdateRequest {
  name?: string
  slug?: string
  description?: string
  website?: string
  email?: string
  phone?: string
  address?: string
  socials?: Record<string, unknown>
  industry_id?: string
  logo_url?: string
  cover_url?: string
  featured_until?: string
  featured_priority?: number
}

export interface CompanyStatusRequest {
  action: "verify" | "unverify" | "activate" | "suspend" | "reject" | "archive" | "restore"
  reason?: string
  note?: string
}

export interface FeaturedEmployerRequest {
  enabled: boolean
  start_at?: string
  end_at?: string
  priority?: number
}

// Users
export interface AdminUser {
  id: string
  email: string
  email_normalized: string
  full_name: string | null
  role: string
  status: string
  email_verified_at: string | null
  last_login_at: string | null
  created_at: string | null
  updated_at: string | null
}

export interface UserListResponse {
  items: AdminUser[]
  total: number
  page: number
  limit: number
  total_pages: number
}

export interface UserDetailOut extends AdminUser {
  active_sessions_count: number | null
  company_name: string | null
  applications_count: number | null
}

export interface UserStatusRequest {
  action: "suspend" | "unsuspend" | "deactivate" | "reactivate"
  reason?: string
}

export interface RevokeSessionsRequest {
  reason?: string
}

// Categories
export interface AdminCategory {
  id: string
  name: string
  slug: string
  icon: string | null
  description: string | null
  seo_title: string | null
  seo_description: string | null
  sort_order: number
  is_active: boolean
  total_jobs_count: number | null
  active_jobs_count: number | null
  created_at: string | null
  updated_at: string | null
}

export interface CategoryListResponse {
  items: AdminCategory[]
  total: number
  page: number
  limit: number
  total_pages: number
}

export interface CategoryCreateRequest {
  name: string
  slug: string
  icon?: string
  description?: string
  seo_title?: string
  seo_description?: string
  sort_order?: number
  is_active?: boolean
}

export interface CategoryUpdateRequest {
  name?: string
  slug?: string
  icon?: string
  description?: string
  seo_title?: string
  seo_description?: string
  sort_order?: number
  is_active?: boolean
}

// Industries
export interface AdminIndustry {
  id: string
  name: string
  slug: string
  description: string | null
  seo_title: string | null
  seo_description: string | null
  sort_order: number
  is_active: boolean
  total_companies_count: number | null
  total_jobs_count: number | null
  created_at: string | null
  updated_at: string | null
}

export interface IndustryListResponse {
  items: AdminIndustry[]
  total: number
  page: number
  limit: number
  total_pages: number
}

export interface IndustryCreateRequest {
  name: string
  slug: string
  description?: string
  seo_title?: string
  seo_description?: string
  sort_order?: number
  is_active?: boolean
}

export interface IndustryUpdateRequest {
  name?: string
  slug?: string
  description?: string
  seo_title?: string
  seo_description?: string
  sort_order?: number
  is_active?: boolean
}

// Regions
export interface AdminRegion {
  id: string
  name: string
  slug: string
  country: string
  city: string | null
  sort_order: number
  is_active: boolean
  total_jobs_count: number | null
  created_at: string | null
  updated_at: string | null
}

export interface RegionListResponse {
  items: AdminRegion[]
  total: number
  page: number
  limit: number
  total_pages: number
}

export interface RegionCreateRequest {
  name: string
  slug: string
  country?: string
  city?: string
  sort_order?: number
  is_active?: boolean
}

export interface RegionUpdateRequest {
  name?: string
  slug?: string
  country?: string
  city?: string
  sort_order?: number
  is_active?: boolean
}

// Internships
export interface AdminInternship {
  id: string
  company_id: string
  company_name: string | null
  title: string
  slug: string
  description: string | null
  requirements: string | null
  location: string | null
  region_id: string | null
  region_name: string | null
  work_mode: string | null
  application_url: string | null
  application_deadline: string | null
  start_date: string | null
  end_date: string | null
  status: string
  moderation_reason: string | null
  moderation_note: string | null
  admin_note: string | null
  is_featured: boolean
  featured_until: string | null
  views: number
  applications_count: number
  created_at: string | null
  updated_at: string | null
}

export interface InternshipListResponse {
  items: AdminInternship[]
  total: number
  page: number
  limit: number
  total_pages: number
}

export interface InternshipCreateRequest {
  company_id: string
  title: string
  slug: string
  description?: string
  requirements?: string
  location?: string
  region_id?: string
  work_mode?: string
  application_url?: string
  application_deadline?: string
  start_date?: string
  end_date?: string
  status?: string
}

export interface InternshipUpdateRequest {
  title?: string
  slug?: string
  description?: string
  requirements?: string
  location?: string
  region_id?: string
  work_mode?: string
  application_url?: string
  application_deadline?: string
  start_date?: string
  end_date?: string
  is_featured?: boolean
  featured_until?: string
}

export interface InternshipStatusRequest {
  action: "approve" | "reject" | "publish" | "unpublish" | "feature" | "archive" | "restore"
  reason?: string
  note?: string
}

// Trainings
export interface AdminTraining {
  id: string
  provider_id: string
  provider_name: string | null
  title: string
  slug: string
  description: string | null
  location: string | null
  format: string | null
  price: number | null
  currency: string | null
  application_url: string | null
  start_date: string | null
  end_date: string | null
  application_deadline: string | null
  status: string
  moderation_reason: string | null
  moderation_note: string | null
  admin_note: string | null
  is_featured: boolean
  featured_until: string | null
  views: number
  applications_count: number
  created_at: string | null
  updated_at: string | null
}

export interface TrainingListResponse {
  items: AdminTraining[]
  total: number
  page: number
  limit: number
  total_pages: number
}

export interface TrainingCreateRequest {
  provider_id: string
  title: string
  slug: string
  description?: string
  location?: string
  format?: string
  price?: number
  currency?: string
  application_url?: string
  start_date?: string
  end_date?: string
  application_deadline?: string
  status?: string
}

export interface TrainingUpdateRequest {
  title?: string
  slug?: string
  description?: string
  location?: string
  format?: string
  price?: number
  currency?: string
  application_url?: string
  start_date?: string
  end_date?: string
  application_deadline?: string
  is_featured?: boolean
  featured_until?: string
}

export interface TrainingStatusRequest {
  action: "approve" | "reject" | "publish" | "unpublish" | "feature" | "archive" | "restore"
  reason?: string
  note?: string
}

// Advertisements
export interface AdminAdvertisement {
  id: string
  advertiser_name: string
  campaign_name: string
  industry: string | null
  headline: string | null
  description: string | null
  cta_label: string | null
  destination_url: string | null
  alt_text: string | null
  placement: string
  format: string
  creative_image: string | null
  mobile_image: string | null
  creative_image_url: string | null
  mobile_image_url: string | null
  creative_file_size: number | null
  creative_mime_type: string | null
  creative_width: number | null
  creative_height: number | null
  background: string | null
  accent_color: string | null
  start_at: string | null
  end_at: string | null
  priority: number
  status: string
  impressions: number
  clicks: number
  ctr: number | null
  created_by: string | null
  created_at: string | null
  updated_at: string | null
  moderation_history?: Record<string, unknown>[]
}

export interface AdvertisementListResponse {
  items: AdminAdvertisement[]
  total: number
  page: number
  limit: number
  total_pages: number
}

export interface AdvertisementDetailOut extends AdminAdvertisement {
  moderation_history: Record<string, unknown>[]
}

export interface AdvertisementCreateRequest {
  advertiser_name: string
  campaign_name: string
  industry?: string
  headline?: string
  description?: string
  cta_label?: string
  destination_url?: string
  alt_text?: string
  placement: string
  format: string
  creative_image?: string
  mobile_image?: string
  creative_image_url?: string
  mobile_image_url?: string
  background?: string
  accent_color?: string
  start_at?: string
  end_at?: string
  priority?: number
  status?: string
}

export interface AdvertisementUpdateRequest {
  advertiser_name?: string
  campaign_name?: string
  industry?: string
  headline?: string
  description?: string
  cta_label?: string
  destination_url?: string
  alt_text?: string
  placement?: string
  format?: string
  creative_image?: string
  mobile_image?: string
  creative_image_url?: string
  mobile_image_url?: string
  background?: string
  accent_color?: string
  start_at?: string
  end_at?: string
  priority?: number
  status?: string
}

export interface AdvertisementStatusRequest {
  action: "activate" | "pause" | "resume" | "archive" | "schedule"
  reason?: string
}

export interface AdvertisementUploadResponse {
  url: string
  file_size: number
  mime_type: string
  width?: number
  height?: number
}

// Public Ads
export interface PublicAdOut {
  id: string
  advertiser_name: string
  campaign_name: string
  headline: string | null
  description: string | null
  cta_label: string | null
  destination_url: string | null
  alt_text: string | null
  format: string
  creative_image_url: string | null
  mobile_image_url: string | null
  background: string | null
  accent_color: string | null
}

export interface PublicAdsResponse {
  items: PublicAdOut[]
}

export const adminApi = {
  login(email: string, password: string) {
    return request<{ message: string }>("/auth/login", {
      method: "POST",
      body: JSON.stringify({ email, password }),
    })
  },

  logout() {
    return request<{ message: string }>("/auth/logout", { method: "POST" })
  },

  me() {
    return request<AdminMe>("/admin/me")
  },

  dashboard() {
    return request<DashboardData>("/admin/dashboard")
  },

  // Jobs
  listJobs(params: Record<string, string | number | boolean | undefined> = {}) {
    const qs = new URLSearchParams()
    for (const [key, value] of Object.entries(params)) {
      if (value !== undefined && value !== null && value !== "") {
        qs.set(key, String(value))
      }
    }
    const query = qs.toString()
    return request<JobListResponse>(`/admin/jobs${query ? `?${query}` : ""}`)
  },

  getJob(id: string) {
    return request<AdminJob>(`/admin/jobs/${id}`)
  },

  moderate(id: string, decision: "approve" | "reject", reason?: string, note?: string) {
    return request<AdminJob>(`/admin/jobs/${id}/moderation`, {
      method: "POST",
      body: JSON.stringify({ decision, reason, note }),
    })
  },

  changeStatus(id: string, action: "publish" | "unpublish" | "pause" | "archive" | "restore", note?: string) {
    return request<AdminJob>(`/admin/jobs/${id}/status`, {
      method: "POST",
      body: JSON.stringify({ action, note }),
    })
  },

  setPremium(id: string, enabled: boolean, endAt?: string, boostPriority?: number) {
    return request<AdminJob>(`/admin/jobs/${id}/premium`, {
      method: "POST",
      body: JSON.stringify({ enabled, end_at: endAt, boost_priority: boostPriority }),
    })
  },

  setFeatured(id: string, enabled: boolean, endAt?: string) {
    return request<AdminJob>(`/admin/jobs/${id}/featured`, {
      method: "POST",
      body: JSON.stringify({ enabled, end_at: endAt }),
    })
  },

  setUrgent(id: string, enabled: boolean, endAt?: string) {
    return request<AdminJob>(`/admin/jobs/${id}/urgent`, {
      method: "POST",
      body: JSON.stringify({ enabled, end_at: endAt }),
    })
  },

  deleteJob(id: string) {
    return request<{ message?: string }>(`/admin/jobs/${id}`, { method: "DELETE" })
  },

  // Companies
  listCompanies(params: Record<string, string | number | boolean | undefined> = {}) {
    const qs = new URLSearchParams()
    for (const [key, value] of Object.entries(params)) {
      if (value !== undefined && value !== null && value !== "") {
        qs.set(key, String(value))
      }
    }
    const query = qs.toString()
    return request<CompanyListResponse>(`/admin/companies${query ? `?${query}` : ""}`)
  },

  getCompany(id: string) {
    return request<CompanyDetailOut>(`/admin/companies/${id}`)
  },

  createCompany(data: CompanyCreateRequest) {
    return request<CompanyDetailOut>("/admin/companies", {
      method: "POST",
      body: JSON.stringify(data),
    })
  },

  updateCompany(id: string, data: Partial<CompanyUpdateRequest>) {
    return request<CompanyDetailOut>(`/admin/companies/${id}`, {
      method: "PATCH",
      body: JSON.stringify(data),
    })
  },

  changeCompanyStatus(id: string, action: "verify" | "unverify" | "activate" | "suspend" | "reject" | "archive" | "restore", reason?: string, note?: string) {
    return request<CompanyDetailOut>(`/admin/companies/${id}/status`, {
      method: "POST",
      body: JSON.stringify({ action, reason, note }),
    })
  },

  setFeaturedEmployer(id: string, enabled: boolean, startAt?: string, endAt?: string, priority?: number) {
    return request<CompanyDetailOut>(`/admin/companies/${id}/featured-employer`, {
      method: "POST",
      body: JSON.stringify({ enabled, start_at: startAt, end_at: endAt, priority }),
    })
  },

  // Users
  listUsers(params: Record<string, string | number | boolean | undefined> = {}) {
    const qs = new URLSearchParams()
    for (const [key, value] of Object.entries(params)) {
      if (value !== undefined && value !== null && value !== "") {
        qs.set(key, String(value))
      }
    }
    const query = qs.toString()
    return request<UserListResponse>(`/admin/users${query ? `?${query}` : ""}`)
  },

  getUser(id: string) {
    return request<UserDetailOut>(`/admin/users/${id}`)
  },

  changeUserStatus(id: string, action: "suspend" | "unsuspend" | "deactivate" | "reactivate", reason?: string) {
    return request<UserDetailOut>(`/admin/users/${id}/status`, {
      method: "POST",
      body: JSON.stringify({ action, reason }),
    })
  },

  revokeUserSessions(id: string, reason?: string) {
    return request<UserDetailOut>(`/admin/users/${id}/revoke-sessions`, {
      method: "POST",
      body: JSON.stringify({ reason }),
    })
  },

  // Categories
  listCategories(params: Record<string, string | number | boolean | undefined> = {}) {
    const qs = new URLSearchParams()
    for (const [key, value] of Object.entries(params)) {
      if (value !== undefined && value !== null && value !== "") {
        qs.set(key, String(value))
      }
    }
    const query = qs.toString()
    return request<CategoryListResponse>(`/admin/categories${query ? `?${query}` : ""}`)
  },

  createCategory(data: CategoryCreateRequest) {
    return request<AdminCategory>("/admin/categories", {
      method: "POST",
      body: JSON.stringify(data),
    })
  },

  updateCategory(id: string, data: Partial<CategoryUpdateRequest>) {
    return request<AdminCategory>(`/admin/categories/${id}`, {
      method: "PATCH",
      body: JSON.stringify(data),
    })
  },

  changeCategoryStatus(id: string, action: "activate" | "deactivate" | "archive", reason?: string) {
    return request<AdminCategory>(`/admin/categories/${id}/status`, {
      method: "POST",
      body: JSON.stringify({ action, reason }),
    })
  },

  // Industries
  listIndustries(params: Record<string, string | number | boolean | undefined> = {}) {
    const qs = new URLSearchParams()
    for (const [key, value] of Object.entries(params)) {
      if (value !== undefined && value !== null && value !== "") {
        qs.set(key, String(value))
      }
    }
    const query = qs.toString()
    return request<IndustryListResponse>(`/admin/industries${query ? `?${query}` : ""}`)
  },

  createIndustry(data: IndustryCreateRequest) {
    return request<AdminIndustry>("/admin/industries", {
      method: "POST",
      body: JSON.stringify(data),
    })
  },

  updateIndustry(id: string, data: Partial<IndustryUpdateRequest>) {
    return request<AdminIndustry>(`/admin/industries/${id}`, {
      method: "PATCH",
      body: JSON.stringify(data),
    })
  },

  changeIndustryStatus(id: string, action: "activate" | "deactivate" | "archive", reason?: string) {
    return request<AdminIndustry>(`/admin/industries/${id}/status`, {
      method: "POST",
      body: JSON.stringify({ action, reason }),
    })
  },

  // Regions
  listRegions(params: Record<string, string | number | boolean | undefined> = {}) {
    const qs = new URLSearchParams()
    for (const [key, value] of Object.entries(params)) {
      if (value !== undefined && value !== null && value !== "") {
        qs.set(key, String(value))
      }
    }
    const query = qs.toString()
    return request<RegionListResponse>(`/admin/regions${query ? `?${query}` : ""}`)
  },

  createRegion(data: RegionCreateRequest) {
    return request<AdminRegion>("/admin/regions", {
      method: "POST",
      body: JSON.stringify(data),
    })
  },

  updateRegion(id: string, data: Partial<RegionUpdateRequest>) {
    return request<AdminRegion>(`/admin/regions/${id}`, {
      method: "PATCH",
      body: JSON.stringify(data),
    })
  },

  changeRegionStatus(id: string, action: "activate" | "deactivate" | "archive", reason?: string) {
    return request<AdminRegion>(`/admin/regions/${id}/status`, {
      method: "POST",
      body: JSON.stringify({ action, reason }),
    })
  },

  // Internships
  listInternships(params: Record<string, string | number | boolean | undefined> = {}) {
    const qs = new URLSearchParams()
    for (const [key, value] of Object.entries(params)) {
      if (value !== undefined && value !== null && value !== "") {
        qs.set(key, String(value))
      }
    }
    const query = qs.toString()
    return request<InternshipListResponse>(`/admin/internships${query ? `?${query}` : ""}`)
  },

  getInternship(id: string) {
    return request<AdminInternship>(`/admin/internships/${id}`)
  },

  createInternship(data: InternshipCreateRequest) {
    return request<AdminInternship>("/admin/internships", {
      method: "POST",
      body: JSON.stringify(data),
    })
  },

  updateInternship(id: string, data: Partial<InternshipUpdateRequest>) {
    return request<AdminInternship>(`/admin/internships/${id}`, {
      method: "PATCH",
      body: JSON.stringify(data),
    })
  },

  changeInternshipStatus(id: string, action: "approve" | "reject" | "publish" | "unpublish" | "feature" | "archive" | "restore", reason?: string, note?: string) {
    return request<AdminInternship>(`/admin/internships/${id}/status`, {
      method: "POST",
      body: JSON.stringify({ action, reason, note }),
    })
  },

  // Trainings
  listTrainings(params: Record<string, string | number | boolean | undefined> = {}) {
    const qs = new URLSearchParams()
    for (const [key, value] of Object.entries(params)) {
      if (value !== undefined && value !== null && value !== "") {
        qs.set(key, String(value))
      }
    }
    const query = qs.toString()
    return request<TrainingListResponse>(`/admin/trainings${query ? `?${query}` : ""}`)
  },

  getTraining(id: string) {
    return request<AdminTraining>(`/admin/trainings/${id}`)
  },

  createTraining(data: TrainingCreateRequest) {
    return request<AdminTraining>("/admin/trainings", {
      method: "POST",
      body: JSON.stringify(data),
    })
  },

  updateTraining(id: string, data: Partial<TrainingUpdateRequest>) {
    return request<AdminTraining>(`/admin/trainings/${id}`, {
      method: "PATCH",
      body: JSON.stringify(data),
    })
  },

  changeTrainingStatus(id: string, action: "approve" | "reject" | "publish" | "unpublish" | "feature" | "archive" | "restore", reason?: string, note?: string) {
    return request<AdminTraining>(`/admin/trainings/${id}/status`, {
      method: "POST",
      body: JSON.stringify({ action, reason, note }),
    })
  },

  // Advertisements
  listAds(params: Record<string, string | number | boolean | undefined> = {}) {
    const qs = new URLSearchParams()
    for (const [key, value] of Object.entries(params)) {
      if (value !== undefined && value !== null && value !== "") {
        qs.set(key, String(value))
      }
    }
    const query = qs.toString()
    return request<AdvertisementListResponse>(`/admin/ads${query ? `?${query}` : ""}`)
  },

  getAd(id: string) {
    return request<AdvertisementDetailOut>(`/admin/ads/${id}`)
  },

  createAd(data: AdvertisementCreateRequest) {
    return request<AdvertisementDetailOut>("/admin/ads", {
      method: "POST",
      body: JSON.stringify(data),
    })
  },

  updateAd(id: string, data: Partial<AdvertisementUpdateRequest>) {
    return request<AdvertisementDetailOut>(`/admin/ads/${id}`, {
      method: "PATCH",
      body: JSON.stringify(data),
    })
  },

  changeAdStatus(id: string, action: "activate" | "pause" | "resume" | "archive" | "schedule", reason?: string) {
    return request<AdvertisementDetailOut>(`/admin/ads/${id}/status`, {
      method: "POST",
      body: JSON.stringify({ action, reason }),
    })
  },

  trackImpression(id: string) {
    return request<{ success: boolean; impressions: number }>(`/admin/ads/${id}/impressions`, {
      method: "POST",
    })
  },

  trackClick(id: string) {
    return request<{ success: boolean; clicks: number; destination_url: string }>(`/admin/ads/${id}/clicks`, {
      method: "POST",
    })
  },

  // Upload for advertisements
  uploadAdCreative(file: File, isMobile: boolean = false) {
    return uploadFile(file, `/admin/ads/upload${isMobile ? "?mobile=true" : ""}`)
  },

  // Public Ads API
  getActiveAds(placement: string, limit: number = 1) {
    return request<PublicAdsResponse>(`/admin/public/ads/active?placement=${placement}&limit=${limit}`)
  },
}

export function hasPermission(me: AdminMe | null, permission: string): boolean {
  return !!me?.permissions?.includes(permission)
}