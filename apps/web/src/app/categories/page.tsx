"use client"

import { Header } from "@/components/Header"
import { Footer } from "@/components/Footer"
import { CategoryCard } from "@/components/CategoryCard"
import { SectionHeaders } from "@/components/SectionHeader"
import { SearchBar } from "@/components/SearchBar"
import { categories } from "@/lib/fixtures/categories"
import { Search, FolderKanban, Briefcase } from "lucide-react"
import { cn } from "@/lib/utils"
import Link from "next/link"

export default function CategoriesPage() {
  return (
    <div className="min-h-screen flex flex-col">
      <Header />

      <main className="flex-1">
        <nav className="bg-white dark:bg-gray-900 shadow-sm border-b border-border/50">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="flex h-16 items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary text-primary-foreground font-bold text-xl">
                  J
                </div>
                <span className="font-bold text-xl">Joblane</span>
              </div>
              <div className="hidden lg:block flex items-center gap-2">
                <Link href="/" className="text-sm font-medium text-foreground hover:text-primary transition-colors" aria-label="Joblane - Ana səhifə">
                  Bosh səhifə
                </Link>
              </div>
            </div>
          </div>
        </nav>

        {/* Hero Section */}
        <section className="py-16 lg:py-24 bg-gray-50 dark:bg-gray-800">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="grid lg:grid-cols-2 gap-12 items-center">
              <div>
                <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-foreground leading-tight">
                  Employment
                </h1>
                <p className="text-muted-foreground mt-4 max-w-lg">
                  Ideal job search platform for finding your next opportunity
                </p>
                <div className="mt-6">
                  <Link href="/jobs" className="inline-flex items-center gap-2 rounded-md bg-primary px-4 py-2.5 text-sm font-medium text-primary-foreground hover:opacity-90 transition-opacity">
                    <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7l6 9z" /></svg>
                    Vakansiyaları ara
                  </Link>
                </div>
              </div>
              <div className="lg:hidden">
                <Link href="/jobs" className="w-full rounded-md bg-primary px-4 py-2.5 text-sm font-medium text-primary-foreground">
                  Vakansiyaları ara
                </Link>
              </div>
            </div>
          </div>
        </section>

        {/* Categories Grid */}
        <section className="py-16 lg:py-24">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="flex flex-col lg:flex-row gap-4 lg:gap-6 mb-8">
              <div className="flex-1 flex flex-col lg:flex-row gap-2">
                <div className="flex-1 rounded-lg bg-primary/10 px-4 py-3">
                  <Search className="h-4 w-4 text-primary mb-1" aria-hidden="true" />
                  <span className="text-sm text-primary">Kateqoriya</span>
                </div>
                <Link href="/categories" className="select-none text-primary font-medium hover:underline">
                  Bütün kateqoriyaları görə
                </Link>
              </div>
              <Search className="h-5 w-5 text-primary" aria-hidden="true" />
            </div>
            {SectionHeaders.latestJobs()}
            <div className="mt-10 grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
              {categories.map((category) => (
                <CategoryCard key={category.id} category={category} variant="default" />
              ))}
            </div>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  )
}