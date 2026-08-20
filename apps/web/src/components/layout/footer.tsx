"use client"

import Link from "next/link"
import { Mail, Phone, MapPin, Facebook, Twitter, Linkedin, Instagram, Github } from "lucide-react"
import { cn } from "@/lib/utils"

const footerNavigation = {
  "Joblane": [
    { name: "Haqqımızda", href: "/about" },
    { name: "Əlaqə", href: "/contact" },
    { name: "Karyera", href: "/careers" },
  ],
  "İş axtaranlar üçün": [
    { name: "Vakansiyalar", href: "/jobs" },
    { name: "Şirkətlər", href: "/companies" },
    { name: "Kateqoriyalar", href: "/categories" },
    { name: "CV yarat", href: "/resume/create" },
  ],
  "İşəgötürənlər üçün": [
    { name: "Elanləxdir", href: "/employer/onboarding" },
    { name: "Namizəd bazası", href: "/employer/search" },
    { name: "Qiymətlər", href: "/employer" },
  ],
  "Dəstək": [
    { name: "Yardım", href: "/help" },
    { name: "Məxfilik", href: "/faq" },
    { name: "İstifadə şərtləri", href: "/terms" },
  ],
}

const socialLinks = [
  { name: "LinkedIn", href: "https://linkedin.com/company/joblane", icon: Linkedin, label: "LinkedIn-da bizimlə əlaqə saxlayın" },
  { name: "Twitter", href: "https://twitter.com/joblane", icon: Twitter, label: "Twitter-də bizimlə əlaqə saxlayın" },
  { name: "Facebook", href: "https://facebook.com/joblane", icon: Facebook, label: "Facebook-da bizimlə əlaqə saxlayın" },
  { name: "Instagram", href: "https://instagram.com/joblane", icon: Instagram, label: "Instagram-da bizimlə əlaqə saxlayın" },
  { name: "GitHub", href: "https://github.com/joblane", icon: Github, label: "GitHub-da bizim kodlara baxın" },
]

export default function Footer() {
  return (
    <footer className="border-t border-border/50 bg-background py-12">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-8 mb-12">

          {/* Joblane Brand */}
          <div className="space-y-4">
            <div className="flex items-center gap-2 mb-4">
              <div className="flex h-9 w-9 items-center justify-center rounded-md bg-primary text-primary-foreground font-bold text-lg">
                J
              </div>
              <span className="font-bold text-lg tracking-tight">Joblane</span>
            </div>
            <p className="text-muted-foreground text-sm max-w-xs">
              Hazırsınızmı karyera yolculuğuna başlamağa?
            </p>
            <div className="flex flex-wrap gap-3">
              {socialLinks.map((social) => (
                <a
                  key={social.name}
                  href={social.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sm text-muted-foreground hover:text-primary transition-colors"
                  aria-label={social.label}
                >
                  <social.icon className="h-4 w-4" aria-hidden="true" />
                </a>
              ))}
            </div>
          </div>

          {/* Navigation Columns */}
          {Object.entries(footerNavigation).map(([title, links]) => (
            <nav key={title} className="space-y-3">
              <h3 className="font-semibold text-sm mb-3">{title}</h3>
              <ul className="space-y-2 text-sm text-muted-foreground">
                {links.map((link) => (
                  <li key={link.name}>
                    <Link
                      href={link.href}
                      className="hover:text-primary transition-colors"
                    >
                      {link.name}
                    </Link>
                  </li>
                ))}
              </ul>
            </nav>
          ))}
        </div>

        {/* Bottom */}
        <div className="pt-8 border-t border-border/50 flex flex-col sm:flex-row justify-between items-center gap-4">
          <p className="text-xs text-muted-foreground">
            © {new Date().getFullYear()} Joblane. Bütün hüquqlar qorunur.
          </p>

          <div className="flex items-center gap-6">
            <span className="text-xs text-muted-foreground">AZ</span>
            <span className="text-xs text-muted-foreground cursor-pointer hover:text-primary transition-colors">EN</span>
            <span className="text-xs text-muted-foreground cursor-pointer hover:text-primary transition-colors">RU</span>
          </div>
        </div>
      </div>
    </footer>
  )
}