"use client"

import Link from "next/link"
import { Shield, Users, Building2, Calendar, ChartBar, Mail, Phone, MapPin } from "lucide-react"
import { cn } from "@/lib/utils"
import { companies } from "@/lib/fixtures"

interface Company {
  id: string
  name: string
  slug: string
  logo: string
  industry: string
  location: string
  size: string
  website: string
  verified: boolean
  openJobsCount: number
}

export default function PopularCompanies() {
  return (
    <div className="flex items-center gap-2 text-sm text-muted-foreground">
      <svg className="h-4 w-4 opacity-50" viewBox="0 0 24 24" fill="none" stroke="currentColor">
        <path d="M12 7v6l4 4m0 0v6h-4m-4-4h4m-6-4h6m4-12v6m0 0v6h-4m-4-4h4M8 6L3 14h9l-5 8V6z" />
      </svg>
      <span>Populyar şirkətlər</span>
    </div>
  )
}

export function CompanyCard({ company }: { company: Company }) {
  return (
    <Link
      key={company.id}
      href={`/companies/${company.slug}`}
      className="group rounded-lg border bg-muted p-4 hover:bg-muted/80 transition-colors cursor-pointer"
    >
      {/* Logo */}
      <div className="h-12 w-12 rounded-md bg-muted flex items-center justify-center flex-shrink-0">
        <span className="text-2xl font-bold">{company.name.split(" ")[0][0]}</span>
      </div>

      {/* Company Info */}
      <div className="ml-4 flex-1 min-w-0">
        <h4 className="font-medium line-clamp-1">{company.name}</h4>
        <p className="text-xs text-muted-foreground line-clamp-1">{company.industry}</p>
      </div>

      {/* Open Jobs Count */}
      <div className="mt-2 pt-2 border-t border-border/50">
        <span className="text-xs text-muted-foreground">Açiq loq</span>
        <span className="font-medium ml-1">{company.openJobsCount}</span>
      </div>
    </Link>
  )
}