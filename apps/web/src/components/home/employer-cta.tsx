"use client"

import Link from "next/link"
import { Building2, Briefcase, Shield, Users } from "lucide-react"
import { cn } from "@/lib/utils"

export default function EmployerCTA() {
  return (
    <section className="py-6 lg:py-8 bg-background border-y lg:border-t border-border/50">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 mb-6">
          <div>
            <p className="text-sm font-medium uppercase tracking-wider text-muted-foreground/80">
              "Hazırsınızmı karyera yolculuğuna başmağa?"
            </p>
            <h2 className="text-xl font-bold text-featured mb-2">
              Vakansiyanızı yerləşdirin və uyğun namizədlərə çatın.
            </h2>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 max-w-md">
          <Link
            href="/employer/post-job"
            className="flex items-center gap-3 rounded-lg bg-primary text-primary-foreground px-6 py-3 text-lg transition-colors"
          >
            <Building2 className="h-5 w-5" aria-hidden="true" />
            <span>Elan yerləşdir</span>
          </Link>

          <Link
            href="/employer"
            className="flex items-center gap-3 rounded-lg border border-primary text-primary-foreground px-6 py-3 text-lg transition-colors"
          >
            <Users className="h-5 w-5" aria-hidden="true" />
            <span>İşəgötürən kimi qeydiyyatdan keç</span>
          </Link>
        </div>

        <div className="grid grid-cols-3 gap-3 mt-6 text-sm text-muted-foreground/80">
          <div className="flex items-center gap-2">
            <Building2 className="h-4 w-4" aria-hidden="true" />
            <span>892+ şirkət</span>
          </div>
          <div className="flex items-center gap-2">
            <Users className="h-4 w-4" aria-hidden="true" />
            <span>45,000+ namizəd</span>
          </div>
          <div className="flex items-center gap-2">
            <Shield className="h-4 w-4" aria-hidden="true" />
            <span>Pulsuz Xidvət</span>
          </div>
        </div>
      </div>
    </section>
  )
}