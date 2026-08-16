"use client"

import Link from "next/link"
import { MapPin, Clock, Briefcase, Building2, Heart, Bookmark, CheckCircle2 } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardFooter, CardHeader } from "@/components/ui/card"
import { cn } from "@/lib/utils"

interface JobCardProps {
  job: any
  variant?: "default"
  showCompany?: boolean
  onBookmark?: (jobId: string) => void
  isBookmarked?: boolean
}

export function JobCard({ job, variant = "default", showCompany = true, onBookmark, isBookmarked = false }: JobCardProps) {
  return (
    <Link href={`/jobs/${job.slug}`} className="block">
      <Card className="h-full flex flex-col">
        <CardHeader>
          <div className="flex items-start justify-between gap-4">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-2">
                {job.company.logo && (
                  <Link href={`/companies/${job.company.slug}`} className="flex-shrink-0" aria-label={`${job.company.name} profili`}>
                    <img
                      src={job.company.logo}
                      alt=""
                      className="h-10 w-10 rounded-lg object-cover"
                      loading="lazy"
                    />
                  </Link>
                )}
                <div className="flex items-center gap-2 flex-wrap">
                  <Link href={`/companies/${job.company.slug}`} className="font-semibold text-base text-foreground hover:text-primary transition-colors line-clamp-1">
                    {job.company.name}
                  </Link>
                  {job.company.verified && (
                    <span className="flex items-center gap-1 text-xs text-green-600 dark:text-green-400" title="Tasdiq etilmis sirket">
                      <svg className="h-3.5 w-3.5" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                      </svg>
                    </span>
                  )}
                </div>
              </div>
            </div>
            <h3 className="mt-2 text-lg font-semibold text-foreground line-clamp-1">
              <Link href={`/jobs/${job.slug}`} className="hover:text-primary transition-colors">
                {job.title}
              </Link>
            </h3>
          </div>
        </CardHeader>
        <CardContent className="pb-0">
          <div className="flex flex-wrap items-center gap-3 text-sm text-muted-foreground mb-3">
            <span className="flex items-center gap-1.5">
              <MapPin className="h-3.5 w-3.5" aria-hidden="true" />
              <span>{job.location}</span>
            </span>
            <Badge variant="outline" className="gap-1.5 px-2 py-0.5">
              <Briefcase className="h-3.5 w-3.5" aria-hidden="true" />
              {job.employmentType}
            </Badge>
          </div>

          <p className="text-sm text-muted-foreground line-clamp-2 mb-4">{job.description}</p>

          <div className="flex flex-wrap gap-2 mb-4">
            {job.skills ? (
              <div>
                {job.skills.slice(0, 5).map((skill) => (
                  <Badge key={skill} variant="secondary" className="text-xs">{skill}</Badge>
                ))}
                {job.skills.length > 5 && (
                  <Badge variant="outline" className="text-xs">+{job.skills.length - 5} daha</Badge>
                )}
              </div>
            ) : null}
          </div>
        </CardContent>

        <CardFooter className="flex flex-wrap items-center justify-between gap-3 pt-3 border-t">
          <div className="flex items-center gap-3 text-sm text-muted-foreground">
            <span className="flex items-center gap-1.5">
              <Clock className="h-3.5 w-3.5" aria-hidden="true" />
              <time>{job.publishedAt}</time>
            </span>
            {job.views && (
              <span className="flex items-center gap-1.5" title={`${job.views} baxish`}>
                <svg className="h-3.5 w-3.5" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                  <path d="M10 12a2 2 0 100-4 2 2 0 000 4z" />
                  <path fillRule="evenodd" d="M.458 10C1.732 5.943 5.522 3 10 3s8.268 2.943 9.542 7c-1.274 4.057-5.064 7-9.542 7S1.732 14.057.458 10z" clipRule="evenodd" />
                </svg>
                {job.views.toLocaleString()}
              </span>
            )}
            {job.applicationsCount && (
              <span className="flex items-center gap-1.5" title={`${job.applicationsCount} mureciyet`}>
                <svg className="h-3.5 w-3.5" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                  <path d="M10 12a2 2 0 100-4 2 2 0 000 4z" />
                </svg>
                {job.applicationsCount}
              </span>
            )}
          </div>

          <div className="flex items-center gap-2 ml-auto">
            <Button
              variant={isBookmarked ? "default" : "outline"}
              size="icon"
              onClick={() => onBookmark?.(job.id)}
              aria-label={isBookmarked ? "Yadda saxla" : "Yadda saxla"}
              aria-pressed={isBookmarked}
            >
              <Bookmark className={cn("h-4 w-4", isBookmarked ? "fill-current text-yellow-500" : "")} aria-hidden="true" />
            </Button>
            <Link href={`/jobs/${job.slug}`} className="ml-2">
              <Button size="sm" className="w-full sm:w-auto">
                Muraciet et
              </Button>
            </Link>
          </div>
        </CardFooter>
      </Card>
    </Link>
  )
}
