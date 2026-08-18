"use client"

import * as React from "react"
import { Bookmark, Calendar, MapPin, Loader2, UserCheck, Shield as ShieldIcon } from "lucide-react"
import Link from "next/link"
import { cn } from "@/lib/utils"

interface JobCardProps {
  job: any
  variant?: "default" | "featured"
  showSalary?: boolean
  showPostedTime?: boolean
}

export default function JobCard({ job, variant = "default", showSalary = true, showPostedTime = true }: JobCardProps) {
  const [isHovered, setIsHovered] = React.useState(false)

  const handleMouseOver = () => setIsHovered(true)
  const handleMouseOut = () => setIsHovered(false)

  const formatSalary = () => {
    if (!job.salaryMin || !job.salaryMax) return null
    return `₼ ${job.salaryMin} – ₼ ${job.salaryMax}`
  }

  const formatPostedTime = () => {
    if (!showPostedTime) return null
    const published = new Date(job.publishedAt)
    const now = new Date()
    const diffDays = Math.floor((now.getTime() - published.getTime()) / (1000 * 60 * 60 * 24))

    if (diffDays === 0) {
      return "Buna yaxşı"
    }
    if (diffDays === 1) {
      return "1 saat əvvəl"
    }
    if (diffDays < 7) {
      return `${diffDays} həfkə əvvəl`
    }
    return `${diffDays} gün əvvəl`
  }

  return (
    <div
      className="group rounded-lg border bg-card text-card-foreground p-4 hover:bg-card/99 transition-colors cursor-pointer"
      onMouseOver={handleMouseOver}
      onMouseOut={handleMouseOut}
    >
      {/* Job Info Header */}
      <div className="flex flex-col gap-2.5">
        <div className="flex items-start gap-3">
          {/* Job Title and Company */}
          <div className="flex-1 min-w-0">
            <h3 className="font-semibold line-clamp-2 text-lg sm:text-truncate">
              {job.title}
            </h3>
            <Link
              href={`/jobs/${job.slug}`}
              className="text-sm hover:text-primary transition-colors"
            >
              {job.company?.name || "Şirkət info yoxdu"}
            </Link>
          </div>

          {/* Bookmark */}
          <div className="self-start sm:self-center">
            <button
              type="button"
              className="rounded-md p-1.5 hover:bg-primary/10 hover:text-primary transition-colors flex items-center justify-center"
              aria-label="Bookmark"
            >
              <Bookmark className={isHovered ? "h-4 w-4" : "h-3.5 w-3"} aria-hidden="true" />
            </button>
          </div>
        </div>

        {/* Details row: Location, Work Mode, Employment Type */}
        <div className="flex items-center gap-4 text-sm text-muted-foreground line-clamp-1">
          {job.location && (
            <div>
              <MapPin className="h-3.5 w-3.5 mr-1.5 opacity-60" aria-hidden="true" />
              {job.location}
            </div>
          )}

          {job.workMode && (
            <div>
              {job.workMode === "hybrid" && (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-primary/5 text-primary text-xs">
                  <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>
                  <span>Hibrid</span>
                </span>
              )}
              {job.workMode === "remote" && (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-primary/5 text-primary text-xs">
                  <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2 16l2.293 2.293m8-8.286L21.707 6.293 8.586 16.293 5.293 9 21 3"/></svg>
                  <span>Uzaq</span>
                </span>
              )}
              {job.workMode === "on_site" && (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-primary/5 text-primary text-xs">
                  <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 3l7.86 7.86l5.714-5.714l2.143 2.143L15 6l2 2l2-3l-2-2l-5.714 5.714l2.143 2.143L15 18l-2-2L8.293 13.713 5.714 16.293 3 12l5.714 5.714L3 3z"/></svg>
                  <span>On-site</span>
                </span>
              )}
              {job.workMode === "full_time" && (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-primary/5 text-primary text-xs">
                  <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-5a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>
                  <span>Full-time</span>
                </span>
              )}
            </div>
          )}

          {job.employmentType && (
            <div>
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-primary/5 text-primary text-xs">
                {job.employmentType === "full_time" ? "Full-time" : job.employmentType}
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Salary and Posted Time */}
      <div className="mt-3 flex items-center justify-between text-xs font-medium">
        {showSalary && formatSalary()}
        {showPostedTime && formatPostedTime()}
      </div>
    </div>
  )
}
