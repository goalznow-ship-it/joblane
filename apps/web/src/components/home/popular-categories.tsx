"use client"

import { cn } from "@/lib/utils"
import { Briefcase, Calculator, Shop, Users, HardHat, TrendingUp, Truck, Heart } from "lucide-react"
import { categories } from "@/lib/fixtures/categories"
import Link from "next/link"

interface Category {
  id: string
  name: string
  slug: string
  icon: string
  jobsCount: number
}

export default function PopularCategories() {
  return (
    <div className="flex items-center gap-2 mb-3 text-sm text-muted-foreground">
      <svg className="h-4 w-4 opacity-50" viewBox="0 0 24 24" fill="none" stroke="currentColor"><path d="M12 7v6l4 4m0 0v6h-4m-4-4h4m-6-4h6m4-12v6m0 0v6h-4m-4-4h4M8 6L3 14h9l-5 8V6z"/></svg>
      <span>Populyar kateqoriyalar</span>
    </div>
  )
}

export function CategoryCard({ category }: { category: Category }) {
  const iconMap: Record<string, React.ComponentType> = {
    calculator: "C",
    shop: "S",
    users: "U",
    hardHat: "M",
    trendingUp: "T",
    truck: "L",
    heart: "H",
  }

  const iconComp = iconMap[category.icon] || "C"

  return (
    <Link
      key={category.id}
      href={`/categories?${category.slug}`}
      className="group rounded-lg bg-muted p-3.5 hover:bg-muted/80 transition-colors flex items-center gap-3"
    >
      <div className="flex h-10 w-10 items-center justify-center rounded-md bg-primary/10 text-primary">
        <iconComp className="h-5 w-5" aria-hidden="true" />
      </div>
      <div>
        <span className="font-medium line-clamp-1">{category.name}</span>
        <div className="line-clamp-1 text-xs text-muted-foreground">{category.jobsCount} вакансия</div>
      </div>
      <ChevronDown className="h-3 w-3 opacity-60 group-hover:opacity-100 transition-opacity ml-2" />
    </Link>
  )
}