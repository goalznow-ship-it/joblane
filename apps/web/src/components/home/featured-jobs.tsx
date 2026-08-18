"use client"

import JobCard from "@/components/jobs/job-card"
import Link from "next/link"
import { categories, companies, jobs } from "@/lib/fixtures"

interface FeaturedJobsSectionProps {
  limit?: number
}

export default function FeaturedJobsSection({ limit = 4 }: FeaturedJobsSectionProps) {
  const featuredJobs = jobs.filter(j => j.isFeatured).slice(0, limit)

  return (
    <section className="py-8 lg:py-12 border-y lg:border-t border-border/50 bg-background">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-bold text-featured">Önə çıxan vakansiyalar</h2>
          <Link
            href="/jobs"
            className="text-sm font-medium text-primary hover:underline"
          >
            Bütün vakansiyaları göstər
            <svg className="inline-block ml-1 h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </Link>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-2 xl:grid-cols-3 gap-4">
          {featuredJobs.map((job) => (
            <JobCard
              key={job.id}
              job={job}
              variant="featured"
              showSalary={true}
              showPostedTime={true}
            />
          ))}
        </div>
      </div>
    </section>
  )
}