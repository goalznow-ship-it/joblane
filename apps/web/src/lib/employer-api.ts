// Employer portal API client for Joblane Frontend.
//
// Talks to the Joblane backend /api/v1/employer endpoints using the
// session cookie + CSRF double-submit pattern (same as the admin client).

const EMPLOYER_API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8002"

export class EmployerApiError extends Error {
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

  const res = await fetch(`${EMPLOYER_API_BASE}/api/v1/employer${path}`, {
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
    throw new EmployerApiError(res.status, detail)
  }

  if (res.status === 204) return undefined as T
  return res.json()
}

async function uploadFile(file: File, path: string): Promise<{ url: string }> {
  const formData = new FormData()
  formData.append("file", file)

  const token = getCsrfToken()
  const headers: Record<string, string> = {}
  if (token) headers["X-CSRF-Token"] = token

  const res = await fetch(`${EMPLOYER_API_BASE}/api/v1/employer${path}`, {
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
    throw new EmployerApiError(res.status, detail)
  }
  return res.json()
}

// ---------------------------------------------------------------------------
// Types (snake_case mirrors of the backend employer schemas)
// ---------------------------------------------------------------------------

export interface EmployerMembership {
  id: string
  company_id: string
  company_name: string
  company_status: string
  role: string
  status: string
}

export interface EmployerCompany {
  id: string
  name: string
  slug: string
  description?: string | null
  website?: string | null
  email?: string | null
  phone?: string | null
  address?: string | null
  socials?: Record<string, string> | null
  industry_id?: string | null
  industry_name?: string | null
  logo_url?: string | null
  cover_url?: string | null
  status: string
  verified_at?: string | null
  verification_notes?: string | null
  active_jobs_count: number
  total_jobs_count: number
  created_at: string
  updated_at?: string | null
}

export interface EmployerMe {
  id: string
  email: string
  full_name?: string | null
  email_verified: boolean
  status: string
  memberships: EmployerMembership[]
  current_company?: EmployerCompany | null
}

export interface EmployerModerationHistoryEntry {
  id: string
  from_status?: string | null
  to_status: string
  actor_id?: string | null
  actor_email?: string | null
  reason?: string | null
  note?: string | null
  created_at: string
}

export interface EmployerJob {
  id: string
  company_id: string
  title: string
  slug: string
  description?: string | null
  requirements?: string | null
  responsibilities?: string | null
  benefits?: string | null
  salary_min?: number | null
  salary_max?: number | null
  salary_currency?: string | null
  salary_period?: string | null
  salary_visible?: boolean | null
  location?: string | null
  region_id?: string | null
  category_id?: string | null
  industry?: string | null
  employment_type?: string | null
  work_mode?: string | null
  experience_level?: string | null
  education?: string | null
  application_deadline?: string | null
  status: string
  moderation_reason?: string | null
  moderation_note?: string | null
  publication_date?: string | null
  expiration_date?: string | null
  is_premium: boolean
  is_featured: boolean
  is_urgent: boolean
  views: number
  applications_count: number
  favorites_count: number
  created_by?: string | null
  created_at: string
  updated_at?: string | null
  moderation_history?: EmployerModerationHistoryEntry[]
}

export interface EmployerJobList {
  items: EmployerJob[]
  total: number
  page: number
  limit: number
}

export interface EmployerApplication {
  id: string
  job_id: string
  job_title?: string | null
  candidate_id: string
  candidate_name?: string | null
  candidate_email?: string | null
  cover_letter?: string | null
  status: string
  applied_at: string
  created_at: string
}

export interface EmployerApplicationList {
  items: EmployerApplication[]
  total: number
  page: number
  limit: number
}

export interface EmployerDashboard {
  company: EmployerCompany
  jobs_total: number
  jobs_draft: number
  jobs_pending_review: number
  jobs_published: number
  jobs_paused: number
  jobs_rejected: number
  jobs_archived: number
  applications_total: number
  applications_new: number
  applications_shortlisted: number
  applications_interview: number
  applications_hired: number
  total_views: number
  recent_applications: EmployerApplication[]
}

export interface JobPayload {
  title: string
  description?: string | null
  requirements?: string | null
  responsibilities?: string | null
  benefits?: string | null
  salary_min?: number | null
  salary_max?: number | null
  salary_currency?: string
  salary_period?: string
  salary_visible?: boolean
  location?: string | null
  region_id?: string | null
  category_id?: string | null
  industry?: string | null
  employment_type: string
  work_mode?: string | null
  experience_level?: string | null
  education?: string | null
  application_deadline?: string | null
}

export interface CompanyPayload {
  name?: string
  slug?: string
  description?: string | null
  website?: string | null
  email?: string | null
  phone?: string | null
  address?: string | null
  socials?: Record<string, string> | null
  industry_id?: string | null
  logo_url?: string | null
  cover_url?: string | null
}

// ---------------------------------------------------------------------------
// Client
// ---------------------------------------------------------------------------

export const employerApi = {
  me(): Promise<EmployerMe> {
    return request<EmployerMe>("/me")
  },

  createCompany(payload: CompanyPayload): Promise<EmployerCompany> {
    return request<EmployerCompany>("/company", {
      method: "POST",
      body: JSON.stringify(payload),
    })
  },

  getCompany(): Promise<EmployerCompany> {
    return request<EmployerCompany>("/company")
  },

  updateCompany(payload: CompanyPayload): Promise<EmployerCompany> {
    return request<EmployerCompany>("/company", {
      method: "PATCH",
      body: JSON.stringify(payload),
    })
  },

  uploadLogo(file: File): Promise<{ url: string }> {
    return uploadFile(file, "/company/logo")
  },

  uploadCover(file: File): Promise<{ url: string }> {
    return uploadFile(file, "/company/cover")
  },

  dashboard(): Promise<EmployerDashboard> {
    return request<EmployerDashboard>("/dashboard")
  },

  listJobs(params: {
    q?: string
    status?: string
    sort?: string
    page?: number
    limit?: number
  } = {}): Promise<EmployerJobList> {
    const qs = new URLSearchParams()
    if (params.q) qs.set("q", params.q)
    if (params.status) qs.set("status", params.status)
    if (params.sort) qs.set("sort", params.sort)
    if (params.page) qs.set("page", String(params.page))
    if (params.limit) qs.set("limit", String(params.limit))
    return request<EmployerJobList>(`/jobs?${qs.toString()}`)
  },

  getJob(jobId: string): Promise<EmployerJob> {
    return request<EmployerJob>(`/jobs/${jobId}`)
  },

  createJob(payload: JobPayload): Promise<EmployerJob> {
    return request<EmployerJob>("/jobs", {
      method: "POST",
      body: JSON.stringify(payload),
    })
  },

  updateJob(jobId: string, payload: Partial<JobPayload>): Promise<EmployerJob> {
    return request<EmployerJob>(`/jobs/${jobId}`, {
      method: "PATCH",
      body: JSON.stringify(payload),
    })
  },

  jobAction(jobId: string, action: "submit" | "pause" | "archive", note?: string): Promise<EmployerJob> {
    return request<EmployerJob>(`/jobs/${jobId}/status`, {
      method: "POST",
      body: JSON.stringify({ action, note }),
    })
  },

  listApplications(params: {
    job_id?: string
    status?: string
    q?: string
    sort?: string
    page?: number
    limit?: number
  } = {}): Promise<EmployerApplicationList> {
    const qs = new URLSearchParams()
    if (params.job_id) qs.set("job_id", params.job_id)
    if (params.status) qs.set("status", params.status)
    if (params.q) qs.set("q", params.q)
    if (params.sort) qs.set("sort", params.sort)
    if (params.page) qs.set("page", String(params.page))
    if (params.limit) qs.set("limit", String(params.limit))
    return request<EmployerApplicationList>(`/applications?${qs.toString()}`)
  },

  getApplication(applicationId: string): Promise<EmployerApplication> {
    return request<EmployerApplication>(`/applications/${applicationId}`)
  },

  updateApplicationStatus(applicationId: string, status: string): Promise<EmployerApplication> {
    return request<EmployerApplication>(`/applications/${applicationId}/status`, {
      method: "PATCH",
      body: JSON.stringify({ status }),
    })
  },
}

// Status labels (Azerbaijani)
export const JOB_STATUS_LABELS: Record<string, string> = {
  DRAFT: "Qaralama",
  PENDING_REVIEW: "Yoxlamada",
  APPROVED: "Təsdiqlənib",
  REJECTED: "Rədd edilib",
  PUBLISHED: "Yayımlanıb",
  PAUSED: "Dayandırılıb",
  EXPIRED: "Müddəti bitib",
  ARCHIVED: "Arxivləşdirilib",
}

export const APPLICATION_STATUS_LABELS: Record<string, string> = {
  SUBMITTED: "Yeni müraciət",
  VIEWED: "Baxılıb",
  SHORTLISTED: "Siyahıya alınıb",
  INTERVIEW: "Müsahibə",
  REJECTED: "Rədd edilib",
  HIRED: "İşə götürülüb",
  WITHDRAWN: "Geriyə çəkilib",
}

export const EMPLOYMENT_TYPE_LABELS: Record<string, string> = {
  FULL_TIME: "Tam ştat",
  PART_TIME: "Yarım ştat",
  CONTRACT: "Müqavilə əsasında",
  FREELANCE: "Frilanser",
  INTERNSHIP: "Təcrübə",
  TEMPORARY: "Müvəqqəti",
  SEASONAL: "Mövsümi",
}

export const WORK_MODE_LABELS: Record<string, string> = {
  ON_SITE: "Ofisdə",
  REMOTE: "Remote",
  HYBRID: "Hibrid",
}

export const TEAM_ROLE_LABELS: Record<string, string> = {
  OWNER: "Sahib",
  ADMIN: "Admin",
  RECRUITER: "İşə qəbul",
  VIEWER: "Baxan",
}

export const TEAM_STATUS_LABELS: Record<string, string> = {
  ACTIVE: "Aktiv",
  INVITED: "Dəvət olunub",
  SUSPENDED: "Dayandırılıb",
}

export const INVITATION_STATUS_LABELS: Record<string, string> = {
  PENDING: "Gözləyir",
  ACCEPTED: "Qəbul edilib",
  REVOKED: "Ləğv edilib",
  EXPIRED: "Müddəti bitib",
}

export interface TeamMember {
  id: string
  company_id: string
  user_id: string
  role: string
  status: string
  user_email: string | null
  user_full_name: string | null
  created_at: string | null
  updated_at: string | null
}

export interface TeamInvitation {
  id: string
  company_id: string
  email: string
  role: string
  status: string
  invited_by: string
  expires_at: string | null
  accepted_by: string | null
  accepted_at: string | null
  revoked_by: string | null
  revoked_at: string | null
  created_at: string | null
}

export interface InvitationPreview {
  email: string
  role: string
  company_name: string
  company_logo_url: string | null
  expires_at: string
  status: string
}

export const employerTeamApi = {
  listMembers: () =>
    request<{ items: TeamMember[]; total: number }>("/api/v1/employer/team/"),

  listInvitations: (status?: string) => {
    const qs = status ? `?status=${status}` : ""
    return request<{ items: TeamInvitation[]; total: number }>(
      `/api/v1/employer/team/invitations${qs}`
    )
  },

  inviteMember: (email: string, role: string) =>
    request<TeamInvitation>("/api/v1/employer/team/invitations", {
      method: "POST",
      body: JSON.stringify({ email, role }),
    }),

  resendInvitation: (invitationId: string) =>
    request<TeamInvitation>(
      `/api/v1/employer/team/invitations/${invitationId}/resend`,
      { method: "POST" }
    ),

  revokeInvitation: (invitationId: string) =>
    request<TeamInvitation>(
      `/api/v1/employer/team/invitations/${invitationId}`,
      { method: "DELETE" }
    ),

  changeRole: (membershipId: string, role: string) =>
    request<TeamMember>(`/api/v1/employer/team/${membershipId}/role`, {
      method: "PATCH",
      body: JSON.stringify({ role }),
    }),

  suspend: (membershipId: string) =>
    request<TeamMember>(`/api/v1/employer/team/${membershipId}/suspend`, {
      method: "POST",
    }),

  reactivate: (membershipId: string) =>
    request<TeamMember>(`/api/v1/employer/team/${membershipId}/reactivate`, {
      method: "POST",
    }),

  remove: (membershipId: string) =>
    request<TeamMember>(`/api/v1/employer/team/${membershipId}`, {
      method: "DELETE",
    }),

  leave: () =>
    request<TeamMember>("/api/v1/employer/team/leave", { method: "POST" }),

  transferOwnership: (targetMembershipId: string) =>
    request<{ previous_owner: TeamMember; new_owner: TeamMember }>(
      "/api/v1/employer/team/transfer-ownership",
      { method: "POST", body: JSON.stringify({ target_membership_id: targetMembershipId }) }
    ),
}

export const invitationApi = {
  preview: (token: string) =>
    request<InvitationPreview>(
      `/api/v1/employer/invitations/preview?token=${token}`
    ),

  accept: (token: string) =>
    request<TeamMember>("/api/v1/employer/invitations/accept", {
      method: "POST",
      body: JSON.stringify({ token }),
    }),
}