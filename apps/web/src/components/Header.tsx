"use client"

import * as React from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { Menu, X, Briefcase, Building2, FolderKanban, FileText, User, LogIn, UserPlus, Menu as MenuIcon, ChevronDown, Globe } from "lucide-react"
import { Button } from "@/components/ui/button"
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator } from "@/components/ui/dropdown-menu"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { cn } from "@/lib/utils"

const navigation = [
  { name: "Vakansiyalar", href: "/jobs", icon: Briefcase },
  { name: "Şirkətlər", href: "/companies", icon: Building2 },
  { name: "Kateqoriyalar", href: "/categories", icon: FolderKanban },
]

export function Header() {
  const pathname = usePathname()
  const [mobileMenuOpen, setMobileMenuOpen] = React.useState(false)
  const [userMenuOpen, setUserMenuOpen] = React.useState(false)

  return (
    <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <nav className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8" aria-label="Global">
        <div className="flex h-16 items-center justify-between">
          {/* Logo */}
          <div className="flex items-center gap-8 lg:gap-12">
            <Link href="/" className="flex items-center space-x-2" aria-label="Joblane - Ana səhifə">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary text-primary-foreground font-bold text-xl">
                J
              </div>
              <span className="hidden font-bold text-xl sm:block">Joblane</span>
            </Link>

            {/* Desktop Navigation */}
            <div className="hidden md:flex md:items-center md:gap-6">
              {navigation.map((item) => (
                <Link
                  key={item.name}
                  href={item.href}
                  className={cn(
                    "flex items-center gap-1.5 text-sm font-medium transition-colors hover:text-primary",
                    pathname === item.href ? "text-primary" : "text-muted-foreground"
                  )}
                >
                  <item.icon className="h-4 w-4" aria-hidden="true" />
                  {item.name}
                </Link>
              ))}
            </div>
          </div>

          {/* Desktop Actions */}
          <div className="hidden md:flex md:items-center md:gap-4">
            {/* Language Selector */}
            <div className="relative" role="combobox" aria-label="Dil seçin">
              <button
                className="flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
                aria-expanded="false"
                aria-haspopup="listbox"
              >
                <Globe className="h-4 w-4" aria-hidden="true" />
                <span>AZ</span>
                <ChevronDown className="h-4 w-4" aria-hidden="true" />
              </button>
            </div>

            {/* Auth Buttons */}
            <div className="flex items-center gap-3">
              <Link href="/auth/login">
                <Button variant="ghost" size="sm">Daxil ol</Button>
              </Link>
              <Link href="/auth/register">
                <Button size="sm">Qeydiyyat</Button>
              </Link>
            </div>
          </div>

          {/* Mobile Menu Button */}
          <div className="md:hidden flex items-center gap-4">
            <button
              className="flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
              aria-expanded="false"
              aria-haspopup="listbox"
            >
              <Globe className="h-4 w-4" aria-hidden="true" />
              <span>AZ</span>
              <ChevronDown className="h-4 w-4" aria-hidden="true" />
            </button>
            <Button variant="ghost" size="sm" onClick={() => setMobileMenuOpen(true)} className="lg:hidden">
              <MenuIcon className="h-6 w-6" aria-hidden="true" />
            </Button>
          </div>
        </div>

        {/* Mobile Menu */}
        {mobileMenuOpen && (
          <div className="md:hidden fixed inset-0 z-50 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
            <div className="flex h-full flex-col p-6">
              <div className="flex items-center justify-between mb-8">
                <Link href="/" className="flex items-center space-x-2" aria-label="Joblane - Ana səhifə">
                  <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary text-primary-foreground font-bold text-xl">
                    J
                  </div>
                  <span className="font-bold text-xl">Joblane</span>
                </Link>
                <button onClick={() => setMobileMenuOpen(false)} className="p-2 rounded-md text-muted-foreground hover:text-foreground transition-colors" aria-label="Bağla">
                  <X className="h-6 w-6" aria-hidden="true" />
                </button>
              </div>

              <nav className="flex-1 space-y-4" aria-label="Mobil navigasiya">
                {navigation.map((item) => (
                  <Link
                    key={item.name}
                    href={item.href}
                    onClick={() => setMobileMenuOpen(false)}
                    className={cn(
                      "flex items-center gap-3 px-3 py-3 rounded-lg text-base font-medium transition-colors",
                      pathname === item.href
                        ? "bg-primary/10 text-primary"
                        : "text-muted-foreground hover:bg-accent hover:text-foreground"
                    )}
                  >
                    <item.icon className="h-5 w-5" aria-hidden="true" />
                    {item.name}
                  </Link>
                ))}
                <hr className="border-border" />
                <Link
                  href="/auth/login"
                  onClick={() => setMobileMenuOpen(false)}
                  className="flex items-center gap-3 px-3 py-3 rounded-lg text-base font-medium text-muted-foreground hover:bg-accent hover:text-foreground transition-colors"
                >
                  <LogIn className="h-5 w-5" aria-hidden="true" />
                  Daxil ol
                </Link>
                <Link
                  href="/auth/register"
                  onClick={() => setMobileMenuOpen(false)}
                  className="flex items-center gap-3 px-3 py-3 rounded-lg text-base font-medium text-primary hover:bg-primary/10 transition-colors"
                >
                  <UserPlus className="h-5 w-5" aria-hidden="true" />
                  Qeydiyyat
                </Link>
              </nav>
            </div>
          </div>
        )}
      </nav>
    </header>
  )
}