"use client"

import { Briefcase } from "lucide-react"
import type { Job } from "@joblane/contracts"
import VacancyRow from "./VacancyRow"
import AdvertisementSlot from "./AdvertisementSlot"
import EmptyState from "./EmptyState"
import type { Advertisement } from "@/lib/fixtures"

export default function VacancyList({
  jobs,
  title,
  count,
  inlineAd,
  adEvery = 10,
  onSave,
  savedIds,
}: {
  jobs: Job[]
  title?: string
  count?: string
  inlineAd?: Advertisement
  adEvery?: number
  onSave?: (id: string) => void
  savedIds?: Set<string>
}) {
  if (jobs.length === 0) {
    return (
      <EmptyState
        icon={Briefcase}
        title="Uyğun vakansiya tapılmadı"
        subtitle="Axtarış şərtlərini dəyişin və ya filtrləri təmizləyin"
      />
    )
  }

  return (
    <div className="overflow-hidden rounded-xl border border-border bg-white">
      {title && (
        <div className="flex items-center justify-between border-b border-border bg-slate-50/60 px-3 py-2">
          <h2 className="text-[13px] font-semibold text-slate-800">{title}</h2>
          {count && (
            <span className="rounded-full bg-brand-50 px-2 py-0.5 text-[11px] font-medium text-brand-600">
              {count}
            </span>
          )}
        </div>
      )}
      <div>
        {jobs.map((job, index) => {
          const showAd = inlineAd && index > 0 && index === adEvery
          return (
            <div key={job.id}>
              {showAd && inlineAd && (
                <AdvertisementSlot
                  ad={inlineAd}
                  label="REKLAM"
                  className="px-4 py-3"
                  compact
                />
              )}
              <VacancyRow
                job={job}
                index={index}
                onSave={onSave}
                saved={savedIds?.has(job.id)}
              />
            </div>
          )
        })}
      </div>
    </div>
  )
}