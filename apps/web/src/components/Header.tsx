"use client"

import * as React from "react"
import Link from "next/link"
import { usePathname, useRouter } from "next/navigation"
import { Menu, X, Briefcase, Building2, FolderKanban, LogIn, UserPlus, Menu as MenuIcon, ChevronDown, Globe, LayoutDashboard, Building2 as BuildingIcon, ShieldCheck, LogOut, Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator } from "@/components/ui/dropdown-menu"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { cn } from "@/lib/utils"
import { authApi, ApiError } from "@/lib/api"
import { candidateApi } from "@/lib/candidate-api"
import { employerApi } from "@/lib/employer-api"
import { adminApi } from "@/lib/admin-api"
import { NotificationBell } from "@/components/NotificationBell"

const navigation = [
  { name: "Vakansiyalar", href: "/jobs", icon: Briefcase },
  { name: "Şirkətlər", href: "/companies", icon: Building2 },
  { name: "Kateqoriyalar", href: "/categories", icon: FolderKanban },
]

type PortalAccess = {
  candidate: boolean
  employer: boolean
  admin: boolean
}

export function Header() {
  const pathname = usePathname()
  const router = useRouter()
  const [mobileMenuOpen, setMobileMenuOpen] = React.useState(false)
  const [authChecked, setAuthChecked] = React.useState(false)
  const [authenticated, setAuthenticated] = React.useState(false)
  const [email, setEmail] = React.useState("")
  const [access, setAccess] = React.useState<PortalAccess>({ candidate: false, employer: false, admin: false })
  const [loggingOut, setLoggingOut] = React.useState(false)

  React.useEffect(() => {
    let cancelled = false

    const probeAccess = async (): Promise<PortalAccess> => {
      const result: PortalAccess = { candidate: false, employer: false, admin: false }
      await Promise.all([
        candidateApi.me().then(() => { result.candidate = true }).catch(() => {}),
        employerApi.me().then(() => { result.employer = true }).catch(() => {}),
        adminApi.me().then(() => { result.admin = true }).catch(() => {}),
      ])
      return result
    }

    authApi
      .me()
      .then(async (me) => {
        if (cancelled) return
        setAuthenticated(true)
        setEmail(me.email)
        const portalAccess = await probeAccess()
        if (cancelled) return
        setAccess(portalAccess)
      })
      .catch((err) => {
        if (cancelled) return
        if (!(err instanceof ApiError && err.status === 401)) {
          // non-401 (e.g. network) — keep default unauthenticated UI
        }
      })
      .finally(() => {
        if (!cancelled) setAuthChecked(true)
      })

    return () => {
      cancelled = true
    }
  }, [])

  const handleLogout = async () => {
    setLoggingOut(true)
    try {
      await authApi.logout()
    } catch {
      // ignore
    }
    router.replace("/")
  }

  const portalLinks = [
    ...(access.candidate ? [{ name: "Namizəd paneli", href: "/candidate/dashboard" }] : []),
    ...(access.employer ? [{ name: "İşəgötürən paneli", href: "/employer/dashboard" }] : []),
    ...(access.admin ? [{ name: "Admin paneli", href: "/admin" }] : []),
  ]

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

            {/* Auth Area */}
            {!authChecked ? (
              <div className="flex items-center gap-3">
                <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
              </div>
            ) : authenticated ? (
              <>
                <NotificationBell />
                <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button className="flex items-center gap-2 rounded-full p-1 transition-colors hover:bg-accent" aria-label="Hesab menyusu">
                    <Avatar className="h-8 w-8">
                      <AvatarImage src="" alt="" />
                      <AvatarFallback className="bg-primary text-primary-foreground text-sm font-bold">
                        {(email || "U").charAt(0).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <ChevronDown className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56">
                  <div className="px-2 py-1.5">
                    <p className="truncate text-sm font-semibold text-foreground">{email}</p>
                    <p className="truncate text-xs text-muted-foreground">Daxil olmusunuz</p>
                  </div>
                  <DropdownMenuSeparator />
                  {portalLinks.map((link) => (
                    <DropdownMenuItem key={link.href} asChild>
                      <Link href={link.href} className="flex items-center gap-2 cursor-pointer">
                        {link.name === "Namizəd paneli" && <LayoutDashboard className="h-4 w-4" />}
                        {link.name === "İşəgötürən paneli" && <BuildingIcon className="h-4 w-4" />}
                        {link.name === "Admin paneli" && <ShieldCheck className="h-4 w-4" />}
                        {link.name}
                      </Link>
                    </DropdownMenuItem>
                  ))}
                  <DropdownMenuSeparator />
                  <DropdownMenuItem asChild>
                    <Link href="/jobs" className="flex items-center gap-2 cursor-pointer">
                      <Briefcase className="h-4 w-4" />
                      Vakansiyalara bax
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onSelect={(e) => e.preventDefault()}
                    className="cursor-pointer"
                    onClick={handleLogout}
                  >
                    <span className="flex w-full items-center gap-2 text-red-600">
                      {loggingOut ? <Loader2 className="h-4 w-4 animate-spin" /> : <LogOut className="h-4 w-4" />}
                      Çıxış
                    </span>
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
              </>
            ) : (
              <div className="flex items-center gap-3">
                <Link href="/auth/login">
                  <Button variant="ghost" size="sm">Daxil ol</Button>
                </Link>
                <Link href="/auth/register">
                  <Button size="sm">Qeydiyyat</Button>
                </Link>
              </div>
            )}
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
                {authenticated ? (
                  <>
                    {portalLinks.map((link) => (
                      <Link
                        key={link.href}
                        href={link.href}
                        onClick={() => setMobileMenuOpen(false)}
                        className="flex items-center gap-3 px-3 py-3 rounded-lg text-base font-medium text-muted-foreground hover:bg-accent hover:text-foreground transition-colors"
                      >
                        <LayoutDashboard className="h-5 w-5" aria-hidden="true" />
                        {link.name}
                      </Link>
                    ))}
                    <button
                      onClick={() => {
                        setMobileMenuOpen(false)
                        handleLogout()
                      }}
                      className="flex w-full items-center gap-3 px-3 py-3 rounded-lg text-base font-medium text-red-600 hover:bg-accent transition-colors"
                    >
                      <LogOut className="h-5 w-5" aria-hidden="true" />
                      Çıxış
                    </button>
                  </>
                ) : (
                  <>
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
                  </>
                )}
              </nav>
            </div>
          </div>
        )}
      </nav>
    </header>
  )
}