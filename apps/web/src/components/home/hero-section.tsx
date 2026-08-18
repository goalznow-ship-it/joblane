"use client"

import * as React from "react"
import { Search, MapPin, Globe, Bookmark, Users, Shield, Briefcase, Calendar, Box } from "lucide-react"
import Link from "next/link"
import { cn } from "@/lib/utils"

import { categories } from "@/lib/fixtures/categories"
import { jobs } from "@/lib/fixtures/jobs"

interface HeroSectionProps {
  showSearch?: boolean
}

export default function HeroSection({ showSearch = true }: HeroSectionProps) {
  const featuredJobs = jobs.filter(j => j.isFeatured).slice(0, 4)
  const latestJobs = [...jobs].sort((a, b) => new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime()).slice(0, 4)

  return (
    <section className="relative py-6 sm:py-12 lg:py-8 lg:max-w-7xl mx-auto px-4">
      <div className="relative flex flex-col sm:flex-gap-4 max-w-2xl">
        {/* Eyebrow */}
        <div className="flex items-center gap-2 mb-3">
          <div className="flex h-5 w-5 items-center justify-center rounded-full bg-primary/10 text-primary">
            <Search className="h-3 w-3" aria-hidden="true" />
          </div>
          <span className="text-xs font-medium uppercase tracking-widest text-primary">
            Azərbaycanda yeni karyera imkanlarını kəşf et
          </span>
        </div>

        {/* Headline */}
        <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold leading-tight text-foreground mb-3">
          "Doğru işi. Doğru şirkətdə."
        </h1>

        {/* Supporting text */}
        <p className="text-base sm:text-lg text-muted-foreground mb-6 max-w-xl">
          Minlərlə vakansiya arasından sənə uygun iş imkanlarını kəşf et.
        </p>

        {/* Quick action chips below search */}
        <div className="mt-5 grid grid-cols-2 gap-2 sm:grid-cols-4 lg:grid-cols-6">
          {["Mühasib", "Frontend Developer", "SOC Analyst", "Satış meneceri", "HR", "Sürücü", "Mühəndis", "Qidəçi"].map((term) => (
            <Link
              key={term}
              href={`/jobs?keyword=${encodeURIComponent(term)}`}
              className="flex items-center gap-1.5 rounded-full bg-muted/50 px-2.5 py-1.5 text-xs text-muted-foreground hover:bg-muted transition-colors"
            >
              {term}
            </Link>
          ))}
        </div>
      </div>
    </section>
  )
}