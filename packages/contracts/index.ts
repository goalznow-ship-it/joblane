// Joblane API Contracts
// Shared types between frontend and backend

export interface Job {
  id: string
  title: string
  slug: string
  company: Company
  location: string
  employmentType: EmploymentType
  workMode: WorkMode
  salaryMin?: number
  salaryMax?: number
  currency: string
  description: string
  requirements: string[]
  benefits: string[]
  skills: string[]
  experienceLevel: ExperienceLevel
  publishedAt: string
  expiresAt?: string
  isFeatured: boolean
  isPremium?: boolean
  isUrgent?: boolean
  categorySlug?: string
  views: number
  applicationsCount: number
}

export interface Company {
  id: string
  name: string
  slug: string
  logo?: string
  coverImage?: string
  description: string
  industry: string
  size?: CompanySize
  location?: string
  website?: string
  verified: boolean
  openJobsCount: number
  createdAt: string
}

export interface Category {
  id: string
  name: string
  slug: string
  icon?: string
  jobsCount: number
}

export interface Industry {
  id: string
  name: string
  slug: string
  jobsCount: number
}

export interface Region {
  id: string
  name: string
  slug: string
  city?: string
  jobsCount: number
}

export type EmploymentType = 
  | "full_time"
  | "part_time"
  | "internship"
  | "contract"
  | "freelance"
  | "temporary"
  | "seasonal"

export type WorkMode = 
  | "on_site"
  | "remote"
  | "hybrid"

export type ExperienceLevel = 
  | "entry"
  | "junior"
  | "mid"
  | "senior"
  | "lead"
  | "executive"

export type CompanySize = 
  | "1-10"
  | "11-50"
  | "51-200"
  | "201-500"
  | "501-1000"
  | "1000+"

export interface PaginatedResponse<T> {
  data: T[]
  meta: {
    total: number
    page: number
    limit: number
    totalPages: number
  }
}

export interface JobFilters {
  keyword?: string
  location?: string
  region?: string
  regionId?: string
  category?: string
  categoryId?: string
  industry?: string
  industryId?: string
  employmentType?: EmploymentType[]
  workMode?: WorkMode[]
  experienceLevel?: ExperienceLevel[]
  salaryMin?: number
  salaryMax?: number
  company?: string
  companyId?: string
  premium?: boolean
  featured?: boolean
  urgent?: boolean
  page?: number
  limit?: number
  sort?: JobSort
}

export interface CompanyFilters {
  q?: string
  keyword?: string
  location?: string
  industry?: string
  industryId?: string
  verified?: boolean
  sort?: "jobs_desc" | "name_asc" | "name_desc" | "newest"
  page?: number
  limit?: number
}

export type JobSort = 
  | "newest"
  | "relevance"
  | "salary_desc"
  | "salary_asc"

export interface ApiError {
  error: {
    code: string
    message: string
    details?: Record<string, unknown>
  }
}

export interface AuthTokens {
  accessToken: string
  refreshToken: string
}

export interface User {
  id: string
  email: string
  emailVerified: boolean
  status: string
  createdAt: string
  onboardingIntent?: "candidate" | "employer"
}

export interface RegisterRequest {
  email: string
  password: string
  onboardingIntent?: "candidate" | "employer"
}

export interface LoginRequest {
  email: string
  password: string
}

export interface VerifyEmailRequest {
  token: string
}

export interface ForgotPasswordRequest {
  email: string
}

export interface ResetPasswordRequest {
  token: string
  newPassword: string
}

export interface ChangePasswordRequest {
  currentPassword: string
  newPassword: string
}