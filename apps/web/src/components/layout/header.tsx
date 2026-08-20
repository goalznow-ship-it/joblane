"use client"

import { cn } from "@/lib/utils"
import Link from "next/link"

export default function Header() {
  const navItems = [
    { href: "/jobs", label: "Elanlar" },
    { href: "/categories", label: "Kateqoriyalar" },
    { href: "/industries", label: "Sənaye" },
    { href: "/companies", label: "Şirkətlər" },
    { href: "/regions", label: "Regionlar" },
    { href: "/trainings", label: "Təlimlər" },
  ]

  const dropdownItems = {
    Elanlar: [
      { href: "/jobs", label: "Bütün elanlar" },
      { href: "/categories", label: "Kateqoriyalar" },
      { href: "/industries", label: "Sənə" },
      { href: "/companies", label: "Şirməkçilər" },
      { href: "/regions", label: "Regionlar" },
    ],
  }

  return (
    <header className="border-b bg-background/50 sticky top-0 z-20">
      <div className="max-w-7xl mx-auto px-4">
        <div className="flex items-center justify-between h-16">
          {/* Left: Logo */}
          <a href="/"
             className="flex items-center gap-2 text-sm font-medium tracking-wider">
            <span className="italic">Joblane</span>
          </a>

          {/* Center/Main Nav */}
          <div className="hidden md:block flex items-center gap-8">
            {navItems.map((item) => (
              <a key={item.href} href={item.href}
                 className="text-sm text-muted-foreground hover:text-primary transition-colors"
              >
                {item.label}
              </a>
            ))}
          </div>

          {/* Right: Language & Actions */}
          <div className="flex items-center gap-3">
            {/* Language selector */}
            <div className="relative">
              <select
                className="rounded-lg bg-transparent border border-border/50 px-3 py-2 focus:ring-2 focus:ring-ring focus:ring-offset-2 appearance-none cursor-pointer text-sm"
              >
                <option value="az">AZ</option>
                <option value="en">EN</option>
                <option value="ru">RU</option>
              </select>
            </div>

            {/* Primary CTA button */}
            <a href="/employer/onboarding"
               className="rounded-full bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors">
              Elanlishdir
            </a>
          </div>
        </div>

        {/* Mobile dropdown menu */}
        <div className="hidden md:block">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            {navItems.map((item) => (
              <Link key={item.href} href={item.href}
                className="hover:text-primary transition-colors"
              >
                {item.label}
              </Link>
            ))}
          </div>
        </div>

        {/* Mobile menu button */}
        <button className="md:hidden p-2">
          <svg className="h-6 w-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <line x1="3" y1="6" x2="21" y2="6"></line>
            <line x1="3" y1="12" x2="21" y2="12"></line>
            <line x1="3" y1="18" x2="21" y2="18"></line>
          </svg>
        </button>
      </div>
    </header>
  )
}