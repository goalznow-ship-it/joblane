// Candidate portal API client for Joblane Frontend.
//
// Talks to the Joblane backend /api/v1/candidate endpoints using the
// session cookie + CSRF double-submit pattern (same as employer client).

const CANDIDATE_API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8002"

export class CandidateApiError extends Error {
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
    ...(options.headers as Record<string, string>),
  }

  if (method !== "GET" && method !== "HEAD" && !(options.body instanceof FormData)) {
    headers["Content-Type"] = "application/json"
  }
  if (method !== "GET" && method !== "HEAD") {
    const token = getCsrfToken()
    if (token) headers["X-CSRF-Token"] = token
  }

  const res = await fetch(`${CANDIDATE_API_BASE}/api/v1/candidate${path}`, {
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
    throw new CandidateApiError(res.status, detail)
  }

  if (res.status === 204) return undefined as T
  return res.json()
}

// ---------------------------------------------------------------------------
// Types (snake_case mirrors of the backend candidate schemas)
// ---------------------------------------------------------------------------

export interface CandidateExperience {
  id: string
  title: string
  company_name?: string | null
  location?: string | null
  start_date?: string | null
  end_date?: string | null
  is_current: boolean
  description?: string | null
  created_at: string
  updated_at?: string | null
}

export interface CandidateEducation {
  id: string
  institution: string
  degree?: string | null
  field_of_study?: string | null
  start_date?: string | null
  end_date?: string | null
  is_current: boolean
  description?: string | null
  created_at: string
  updated_at?: string | null
}

export interface CandidateResume {
  id: string
  title: string
  file_url: string
  file_name?: string | null
  file_size?: number | null
  mime_type?: string | null
  is_default: boolean
  created_at: string
  updated_at?: string | null
}

export interface CandidateProfile {
  id: string
  headline?: string | null
  summary?: string | null
  phone?: string | null
  location?: string | null
  website?: string | null
  linkedin_url?: string | null
  github_url?: string | null
  skills?: string[] | null
  experience_years?: number | null
  is_public: boolean
  created_at: string
  updated_at?: string | null
}

export interface CandidateMe {
  id: string
  email: string
  full_name?: string | null
  email_verified: boolean
  status: string
  profile?: CandidateProfile | null
  experiences: CandidateExperience[]
  educations: CandidateEducation[]
  resumes: CandidateResume[]
  saved_jobs_count: number
  applications_count: number
}

export interface SavedJob {
  id: string
  job_id: string
  job_title: string
  job_slug: string
  company_name: string
  company_slug: string
  location?: string | null
  salary_min?: number | null
  salary_max?: number | null
  salary_currency?: string | null
  employment_type?: string | null
  work_mode?: string | null
  is_premium: boolean
  is_featured: boolean
  is_urgent: boolean
  saved_at: string
}

export interface SavedJobList {
  items: SavedJob[]
  total: number
  page: number
  limit: number
}

export interface ApplicationHistoryEntry {
  id: string
  from_status?: string | null
  to_status: string
  changed_by_role: string
  changed_by_id?: string | null
  note?: string | null
  created_at: string
}

export interface CandidateApplication {
  id: string
  job_id: string
  job_title: string
  job_slug: string
  company_name: string
  company_slug: string
  job_status: string
  location?: string | null
  employment_type?: string | null
  work_mode?: string | null
  application_deadline?: string | null
  resume_id?: string | null
  resume_title?: string | null
  cover_letter?: string | null
  status: string
  applied_at: string
  updated_at?: string | null
  history?: ApplicationHistoryEntry[]
}

export interface CandidateApplicationList {
  items: CandidateApplication[]
  total: number
  page: number
  limit: number
}

export interface ProfilePayload {
  headline?: string | null
  summary?: string | null
  phone?: string | null
  location?: string | null
  website?: string | null
  linkedin_url?: string | null
  github_url?: string | null
  skills?: string[] | null
  experience_years?: number | null
  is_public?: boolean | null
}

export interface ExperiencePayload {
  title: string
  company_name?: string | null
  location?: string | null
  start_date?: string | null
  end_date?: string | null
  is_current?: boolean
  description?: string | null
}

export interface EducationPayload {
  institution: string
  degree?: string | null
  field_of_study?: string | null
  start_date?: string | null
  end_date?: string | null
  is_current?: boolean
  description?: string | null
}

// ---------------------------------------------------------------------------
// Client
// ---------------------------------------------------------------------------

export const candidateApi = {
  me(): Promise<CandidateMe> {
    return request<CandidateMe>("/me")
  },

  getProfile(): Promise<CandidateProfile> {
    return request<CandidateProfile>("/profile")
  },

  updateProfile(payload: ProfilePayload): Promise<CandidateProfile> {
    return request<CandidateProfile>("/profile", {
      method: "PATCH",
      body: JSON.stringify(payload),
    })
  },

  listExperiences(): Promise<CandidateExperience[]> {
    return request<CandidateExperience[]>("/experience")
  },

  createExperience(payload: ExperiencePayload): Promise<CandidateExperience> {
    return request<CandidateExperience>("/experience", {
      method: "POST",
      body: JSON.stringify(payload),
    })
  },

  updateExperience(id: string, payload: Partial<ExperiencePayload>): Promise<CandidateExperience> {
    return request<CandidateExperience>(`/experience/${id}`, {
      method: "PATCH",
      body: JSON.stringify(payload),
    })
  },

  deleteExperience(id: string): Promise<void> {
    return request<void>(`/experience/${id}`, { method: "DELETE" })
  },

  listEducations(): Promise<CandidateEducation[]> {
    return request<CandidateEducation[]>("/education")
  },

  createEducation(payload: EducationPayload): Promise<CandidateEducation> {
    return request<CandidateEducation>("/education", {
      method: "POST",
      body: JSON.stringify(payload),
    })
  },

  updateEducation(id: string, payload: Partial<EducationPayload>): Promise<CandidateEducation> {
    return request<CandidateEducation>(`/education/${id}`, {
      method: "PATCH",
      body: JSON.stringify(payload),
    })
  },

  deleteEducation(id: string): Promise<void> {
    return request<void>(`/education/${id}`, { method: "DELETE" })
  },

  listResumes(): Promise<CandidateResume[]> {
    return request<CandidateResume[]>("/resumes")
  },

  uploadResume(file: File, title?: string, isDefault = false): Promise<CandidateResume> {
    const formData = new FormData()
    formData.append("file", file)
    if (title) formData.append("title", title)
    formData.append("is_default", String(isDefault))
    return request<CandidateResume>("/resumes", {
      method: "POST",
      body: formData,
    })
  },

  updateResume(id: string, payload: { title?: string; is_default?: boolean }): Promise<CandidateResume> {
    return request<CandidateResume>(`/resumes/${id}`, {
      method: "PATCH",
      body: JSON.stringify(payload),
    })
  },

  deleteResume(id: string): Promise<void> {
    return request<void>(`/resumes/${id}`, { method: "DELETE" })
  },

  listSaved(params: { page?: number; limit?: number } = {}): Promise<SavedJobList> {
    const qs = new URLSearchParams()
    if (params.page) qs.set("page", String(params.page))
    if (params.limit) qs.set("limit", String(params.limit))
    return request<SavedJobList>(`/saved?${qs.toString()}`)
  },

  saveJob(jobId: string): Promise<{ saved: boolean }> {
    return request<{ saved: boolean }>(`/saved/${jobId}`, { method: "POST" })
  },

  unsaveJob(jobId: string): Promise<void> {
    return request<void>(`/saved/${jobId}`, { method: "DELETE" })
  },

  apply(payload: { job_id: string; resume_id?: string; cover_letter?: string }): Promise<CandidateApplication> {
    return request<CandidateApplication>("/applications", {
      method: "POST",
      body: JSON.stringify(payload),
    })
  },

  listApplications(params: { status?: string; page?: number; limit?: number } = {}): Promise<CandidateApplicationList> {
    const qs = new URLSearchParams()
    if (params.status) qs.set("status", params.status)
    if (params.page) qs.set("page", String(params.page))
    if (params.limit) qs.set("limit", String(params.limit))
    return request<CandidateApplicationList>(`/applications?${qs.toString()}`)
  },

  getApplication(applicationId: string): Promise<CandidateApplication> {
    return request<CandidateApplication>(`/applications/${applicationId}`)
  },

  withdraw(applicationId: string): Promise<{ id: string; status: string }> {
    return request<{ id: string; status: string }>(`/applications/${applicationId}/withdraw`, {
      method: "POST",
    })
  },
}

// Status labels (Azerbaijani)
export const CANDIDATE_APPLICATION_STATUS_LABELS: Record<string, string> = {
  SUBMITTED: "Yeni müraciət",
  VIEWED: "Baxılıb",
  SHORTLISTED: "Siyahıya alınıb",
  INTERVIEW: "Müsahibə",
  REJECTED: "Rədd edilib",
  HIRED: "İşə götürülüb",
  WITHDRAWN: "Geriyə çəkilib",
}

export const CANDIDATE_ROLE_LABELS: Record<string, string> = {
  CANDIDATE: "Namizəd",
  EMPLOYER: "İşəgötürən",
  ADMIN: "Admin",
}

export const CANDIDATE_WORK_MODE_LABELS: Record<string, string> = {
  ON_SITE: "Ofisdə",
  REMOTE: "Remote",
  HYBRID: "Hibrid",
}

export const CANDIDATE_EMPLOYMENT_TYPE_LABELS: Record<string, string> = {
  FULL_TIME: "Tam ştat",
  PART_TIME: "Yarım ştat",
  CONTRACT: "Müqavilə əsasında",
  FREELANCE: "Frilanser",
  INTERNSHIP: "Təcrübə",
  TEMPORARY: "Müvəqqəti",
  SEASONAL: "Mövsümi",
}

export function formatSalaryRange(
  min?: number | null,
  max?: number | null,
  currency?: string | null
): string {
  if (min == null && max == null) return "Maaş göstərilməyib"
  const cur = currency || "AZN"
  if (min != null && max != null) return `${min.toLocaleString("az")} - ${max.toLocaleString("az")} ${cur}`
  if (min != null) return `${min.toLocaleString("az")} ${cur}-dan`
  return `${max?.toLocaleString("az")} ${cur}-a qədər`
}