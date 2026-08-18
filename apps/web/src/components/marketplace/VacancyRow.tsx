"use client"

import Link from "next/link"
import { Heart, MapPin, Briefcase, Eye } from "lucide-react"
import type { Job } from "@joblane/contracts"
import CompanyLogo from "./CompanyLogo"
import PremiumBadge from "./PremiumBadge"
import { cn } from "@/lib/utils"

export function formatSalary(job: Job): string | null {
  if (job.salaryMin == null && job.salaryMax == null) return null
  const min = job.salaryMin ?? 0
  const max = job.salaryMax
  const cur = job.currency ?? "AZN"
  if (max == null) return `${min} ${cur}+`
  if (min === max) return `${min} ${cur}`
  return `${min}–${max} ${cur}`
}

export function formatDate(iso: string): string {
  const date = new Date(iso)
  const now = new Date()
  const diffDays = Math.floor((now.getTime() - date.getTime()) / 86400000)
  if (diffDays <= 0) return "Bu gün"
  if (diffDays === 1) return "Dünən"
  return `${date.getDate()}.${String(date.getMonth() + 1).padStart(2, "0")}.${date.getFullYear()}`
}

export function workModeLabel(mode: Job["workMode"]): string {
  switch (mode) {
    case "on_site":
      return "Dəfəlli"
    case "remote":
      return "Uzaqdan"
    case "hybrid":
      return "Hybrid"
  }
}

export function employmentTypeLabel(type: Job["employmentType"]): string {
  switch (type) {
    case "full_time":
      return "Tam ştat"
    case "part_time":
      return "Part-time"
    case "contract":
      return "Müqavilə"
    case "internship":
      return "Staj"
    case "freelance":
      return "Frilans"
  }
}

export default function VacancyRow({
  job,
  onSave,
  saved = false,
}: {
  job: Job
  index?: number
  onSave?: (id: string) => void
  saved?: boolean
}) {
  const salary = formatSalary(job)

  return (
    <Link
      href={`/jobs/${job.slug}`}
      className={cn(
        "group relative flex items-center gap-3 border-b border-border/70 bg-white px-4 py-3 transition-colors duration-150 last:border-b-0 hover:bg-slate-50/80",
        job.isPremium && "border-l-2 border-l-brand-500"
      )}
    >
      <CompanyLogo name={job.company.name} className="h-10 w-10 shrink-0 rounded-xl" />

      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <h3 className="truncate text-[15px] font-semibold text-slate-800 transition-colors duration-150 group-hover:text-brand-600">
            {job.title}
          </h3>
          {job.isPremium && <PremiumBadge className="shrink-0" />}
        </div>
        <p className="truncate text-[13px] font-medium text-slate-500">
          {job.company.name}
        </p>
        <p className="mt-0.5 flex items-center gap-1.5 text-[12px] text-slate-400">
          <span className="flex items-center gap-1">
            <MapPin className="h-3 w-3" />
            <span className="truncate">{job.location}</span>
          </span>
          <span className="shrink-0 text-slate-300">·</span>
          <span className="shrink-0">{workModeLabel(job.workMode)}</span>
          <span className="shrink-0 text-slate-300">·</span>
          <span className="flex shrink-0 items-center gap-1">
            <Briefcase className="h-3 w-3" />
            {employmentTypeLabel(job.employmentType)}
          </span>
        </p>
      </div>

      <div className="flex w-[104px] shrink-0 flex-col items-end gap-1.5">
        {salary ? (
          <span className="text-[13px] font-semibold text-brand-600">{salary}</span>
        ) : (
          <span className="text-[12px] text-slate-300">Maaş razılaşma əsasında</span>
        )}
        <div className="flex items-center gap-2.5">
          <span className="flex items-center gap-1 text-[11.5px] text-slate-400">
            <Eye className="h-3 w-3" />
            {job.views.toLocaleString("az-AZ")}
          </span>
          <span className="whitespace-nowrap text-[11.5px] font-medium text-slate-500">
            {formatDate(job.publishedAt)}
          </span>
          <button
            type="button"
            onClick={(e) => {
              e.preventDefault()
              e.stopPropagation()
              onSave?.(job.id)
            }}
            className={cn(
              "flex h-7 w-7 items-center justify-center rounded-lg border transition-colors duration-150",
              saved
                ? "border-rose-200 bg-rose-50 text-rose-500"
                : "border-border text-slate-300 hover:border-rose-200 hover:bg-rose-50/50 hover:text-rose-400"
            )}
            aria-label="Seçilmişlərə əlavə et"
          >
            <Heart className={cn("h-3.5 w-3.5", saved && "fill-current")} />
          </button>
        </div>
      </div>
    </Link>
  )
}