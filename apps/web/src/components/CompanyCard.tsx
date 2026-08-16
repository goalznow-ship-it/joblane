"use client"

import Link from "next/link"
import { Building2, Briefcase } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"

interface CompanyCardProps {
  company: any
}

export function CompanyCard({ company }: CompanyCardProps) {
  return (
    <Link href={`/companies/${company.slug}`} className="block">
      <div className="h-full flex flex-col">
        <div className="pb-3">
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-center gap-3 flex-1 min-w-0">
              {company.logo && (
                <div className="flex-shrink-0 relative h-12 w-12 rounded-lg overflow-hidden bg-muted">
                  <img
                    src={company.logo}
                    alt=""
                    className="h-full w-full object-cover"
                    loading="lazy"
                  />
                </div>
              )}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <h3 className="font-semibold text-base text-foreground hover:text-primary transition-colors line-clamp-1">
                    {company.name}
                  </h3>
                </div>
                <p className="mt-1 text-sm text-muted-foreground line-clamp-1">{company.industry}</p>
              </div>
            </div>
          </div>
        </div>

        <div className="pb-0">
          <div className="flex flex-wrap items-center gap-3 text-sm text-muted-foreground mb-3">
            <span className="flex items-center gap-1.5">
              <Building2 className="h-3.5 w-3.5" aria-hidden="true" />
              <span>{company.location}</span>
            </span>
            <span className="flex items-center gap-1.5">
              <span aria-hidden="true" className="h-3.5 w-3.5" /> {/* Briefcase */}
              <span>{company.size}</span>
            </span>
          </div>

          <p className="text-sm text-muted-foreground line-clamp-2 mb-4">{company.description}</p>

          <div className="flex flex-wrap gap-2 mb-4">
            <Badge variant="secondary" className="gap-1.5 px-2 py-0.5">
              <Briefcase className="h-3 w-3" aria-hidden="true" />
              {company.openJobsCount} acik vakansiya
            </Badge>
          </div>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3 pt-3 border-t">
          <div className="flex items-center gap-3 text-sm text-muted-foreground">
            <span className="flex items-center gap-1.5" title="Acik vakansiyalar">
              <Briefcase className="h-3.5 w-3.5" aria-hidden="true" />
              {company.openJobsCount} vakansiya
            </span>
          </div>

          <div className="flex items-center gap-2 ml-auto">
            <Link href={`/companies/${company.slug}`} className="ml-2">
              <Button size="sm" variant="outline" className="w-full sm:w-auto">
                Profilice bax
              </Button>
            </Link>
          </div>
        </div>
      </div>
    </Link>
  )
}
