"use client"

import { cn } from "@/lib/utils"

export default function QuickStats() {
  return (
    <section className="py-4 lg:py-6 border-y lg:border-t border-border/50 bg-background">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 lg:gap-4">
          {/* Stat 1: Active Jobs */}
          <div className="flex items-center gap-2.5 p-3 rounded-xl bg-muted/50">
            <div className="flex-1">
              <div className="text-2xl sm:text-3xl font-bold text-foreground">3200+</div>
              <div className="text-sm text-muted-foreground">Aktiv vakansiya</div>
            </div>
          </div>

          {/* Stat 2: Companies */}
          <div className="flex items-center gap-2.5 p-3 rounded-xl bg-muted/50">
            <div className="flex-1">
              <div className="text-2xl sm:text-3xl font-bold text-foreground">850+</div>
              <div className="text-sm text-muted-foreground">Təsdiq şirkət</div>
            </div>
          </div>

          {/* Stat 3: Users */}
          <div className="flex items-center gap-2.5 p-3 rounded-xl bg-muted/50">
            <div className="flex-1">
              <div className="text-2xl sm:text-3xl font-bold text-foreground">18000+</div>
              <div className="text-sm text-muted-foreground">Namizəd</div>
            </div>
          </div>

          {/* Stat 4: Categories */}
          <div className="flex items-center gap-2.5 p-3 rounded-xl bg-muted/50">
            <div className="flex-1">
              <div className="text-2xl sm:text-3xl font-bold text-foreground">14</div>
              <div className="text-sm text-muted-foreground">Kateqoriya</div>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}