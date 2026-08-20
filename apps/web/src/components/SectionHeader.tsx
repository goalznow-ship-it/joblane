"use client"

import Link from "next/link"
import { ArrowRight, Briefcase, Building2, FolderKanban, Users, Clock, DollarSign, MapPin } from "lucide-react"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

interface SectionHeaderProps {
  title: string
  subtitle?: string
  action?: {
    label: string
    href: string
    variant?: "default" | "outline" | "ghost"
  }
  icon?: React.ReactNode
  className?: string
}

export default function SectionHeader({ title, subtitle, action, icon, className }: SectionHeaderProps) {
  return (
    <div className={cn("flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4", className)}>
      <div className="flex flex-col gap-1">
        <div className="flex items-center gap-2">
          {icon && <span className="text-primary">{icon}</span>}
          <h2 className="text-2xl font-bold text-foreground">{title}</h2>
        </div>
        {subtitle && (
          <p className="text-muted-foreground text-sm">{subtitle}</p>
        )}
      </div>

      {action && (
        <Link href={action.href}>
          <Button variant={action.variant || "default"} size="sm" className="w-full sm:w-auto">
            <span className="flex items-center gap-2">
              {action.label}
              <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </span>
          </Button>
        </Link>
      )}
    </div>
  )
}

// Predefined section headers for common use cases
export const SectionHeaders = {
  latestJobs: () => (
    <SectionHeader
      title="Son vakansiyalar"
      subtitle="Ən yeni elan edilen vakansiyaları kəşf edin"
      action={{ label: "Bütün vakansiyalar", href: "/jobs" }}
      icon={
        <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
        </svg>
      }
    />
  ),

  featuredJobs: () => (
    <SectionHeader
      title="Önə çıxan vakansiyalar"
      subtitle="Şirkətlər tərəfindən sponsor olmuş xüsusi elanlar"
      action={{ label: "Hamısını göstər", href: "/jobs?featured=true" }}
      icon={
        <svg className="h-6 w-6" fill="currentColor" viewBox="0 0 20 20">
          <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-1.07-3.292a1 1 0 00-.95-.69h-3.462c-.969 0-1.371-1.24-.588-1.81l2.8-2.034a1 1 0 00.364-1.118l-1.07-3.292c-.3-.921.755-1.688 1.54-1.118l2.8 2.034a1 1 0 001.175 0z" />
        </svg>
      }
    />
  ),

  popularCategories: () => (
    <SectionHeader
      title="Populyar kateqoriyalar"
      subtitle="İş axtarışınızı kateqoriyalara görə də filoqlayın"
      action={{ label: "Bütün kateqoriyalar", href: "/categories" }}
      icon={
        <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
        </svg>
      }
    />
  ),

  popularCompanies: () => (
    <SectionHeader
      title="Populyar şirkətlər"
      subtitle="Azərbaycanın ən çox iş elan edən şirkətlərini kəşf edin"
      action={{ label: "Bütün şirkətlər", href: "/companies" }}
      icon={
        <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
        </svg>
      }
    />
  ),

  candidateCTA: () => (
    <SectionHeader
      title="Daha yaxşı iş imkanları səni tapsın"
      subtitle="CV yaradın, profillərinizi yeniləyin və sizə uyğun вакансиyalar haqqında xəbərdar olun"
      action={{ label: "CV yarat", href: "/resume/create", variant: "default" }}
      icon={
        <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
        </svg>
      }
    />
  ),

  employerCTA: () => (
    <SectionHeader
      title="Komandanız üçün doğru namizədi tapın"
      subtitle="İş elan edin, namizədlər axtarın və komandanızı genişləndirin"
      action={{ label: "Elan yerləşdir", href: "/employer/onboarding", variant: "default" }}
      icon={
        <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
        </svg>
      }
    />
  ),
}