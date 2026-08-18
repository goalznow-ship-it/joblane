"use client"

import Link from "next/link"
import { Users, Briefcase, Shield, Calendar } from "lucide-react"
import { cn } from "@/lib/utils"

export default function CandidateCTA() {
  return (
    <section className="py-6 lg:py-8 bg-primary/5 text-primary-foreground border-y lg:border-t border-border/50">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 mb-6">
          <div>
            <p className="text-sm font-medium uppercase tracking-wider text-primary/80">
              "İş imkanlarını qaçırma"
            </p>
            <h2 className="text-xl font-bold text-primary mb-2">
              CV-ni Joblane-də yarat və şirkətlərin səni tapmasına imkan ver.
            </h2>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 max-w-md">
          <Link
            href="/resume/create"
            className="flex items-center gap-3 rounded-lg bg-primary text-primary-foreground px-6 py-3 text-lg transition-colors"
          >
            <Users className="h-5 w-5" aria-hidden="true" />
            <span>CV yarat</span>
          </Link>

          <Link
            href="/auth/register"
            className="flex items-center gap-3 rounded-lg border border-primary text-primary-foreground px-6 py-3 text-lg transition-colors"
          >
            <Briefcase className="h-5 w-5" aria-hidden="true" />
            <span>Profil yarat</span>
          </Link>
        </div>

        <div className="grid grid-cols-2 gap-3 mt-6 text-sm text-primary-foreground/80">
          <div className="flex items-center gap-2">
            <Calendar className="h-4 w-4" aria-hidden="true" />
            <span>Asan CV yaradın</span>
          </div>
          <div className="flex items-center gap-2">
            <Shield className="h-4 w-4" aria-hidden="true" />
            <span>Sürətli Axtarış</span>
          </div>
          <div className="flex items-center gap-2">
            <Calendar className="h-4 w-4" aria-hidden="true" />
            <span>Şəxsi təkliflər</span>
          </div>
        </div>
      </div>
    </section>
  )
}