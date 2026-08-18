import Link from "next/link"
import { Briefcase, Building2, FolderKanban, Mail, Phone, MapPin, Facebook, Twitter, Linkedin, Instagram, Github, Briefcase as BriefcaseIcon, FileText, User, Heart, Shield, Globe } from "lucide-react"
import { cn } from "@/lib/utils"

const footerNavigation = {
  "İş axtaranlar üçün": [
    { name: "Vakansiyalar", href: "/jobs" },
    { name: "Şirkətlər", href: "/companies" },
    { name: "Kateqoriyalar", href: "/categories" },
    { name: "CV yarat", href: "/resume/create" },
    { name: "Maaş məlumatları", href: "/salaries" },
  ],
  "İşəgötürənlər üçün": [
    { name: "Elan yerləşdir", href: "/employer/post-job" },
    { name: "İşəgötürən profili", href: "/employer/profile" },
    { name: "Namizəd axtar", href: "/employer/search" },
    { name: "Marka səhifəsi yarat", href: "/employer/branding" },
    { name: "Qiymətləndirmə", href: "/employer/pricing" },
  ],
  "Şirkət haqqında": [
    { name: "Bizim haqqımızda", href: "/about" },
    { name: "Karyera", href: "/careers" },
    { name: "Media kit", href: "/press" },
    { name: "Bloq", href: "/blog" },
  ],
  "Dəstək": [
    { name: "Yardım mərkəzi", href: "/help" },
    { name: "Tez-tez verilən suallar", href: "/faq" },
    { name: "Bizimlə əlaqə", href: "/contact" },
    { name: "Gizlilik Politikası", href: "/privacy" },
    { name: "İstifadə Şərtləri", href: "/terms" },
  ],
}

const socialLinks = [
  { name: "LinkedIn", href: "https://linkedin.com/company/joblane", icon: Linkedin, label: "LinkedIn-da bizimlə əlaqə saxlayın" },
  { name: "Twitter", href: "https://twitter.com/joblane", icon: Twitter, label: "Twitter-də bizimlə əlaqə saxlayın" },
  { name: "Facebook", href: "https://facebook.com/joblane", icon: Facebook, label: "Facebook-da bizimlə əlaqə saxlayın" },
  { name: "Instagram", href: "https://instagram.com/joblane", icon: Instagram, label: "Instagram-da bizimlə əlaqə saxlayın" },
  { name: "GitHub", href: "https://github.com/joblane", icon: Github, label: "GitHub-da bizim kodlara baxın" },
]

const contactInfo = {
  email: "hello@joblane.az",
  phone: "+994 12 555 00 00",
  address: "Bakı şəhəri, Nəsimi rayonu, Bakı İçəri Şəhər, AZ1000",
}

export function Footer() {
  return (
    <footer className="border-t bg-muted/30" role="contentinfo">
      <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8 lg:py-16">
        <div className="xl:grid xl:grid-cols-3 xl:gap-8">
          {/* Brand & Description */}
          <div className="space-y-6">
            <Link href="/" className="flex items-center space-x-2" aria-label="Joblane - Ana səhifə">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary text-primary-foreground font-bold text-xl">
                J
              </div>
              <span className="font-bold text-xl">Joblane</span>
            </Link>
            <p className="text-muted-foreground text-sm max-w-xs">
              Azərbaycanın ən müasir və etibarlı iş platforması. İş axtaranlarla işəgötürənləri bir platformada birləşdiririk.
            </p>
            <div className="flex flex-wrap gap-4">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Mail className="h-4 w-4" aria-hidden="true" />
                <a href={`mailto:${"hello@joblane.az"}`} className="hover:text-primary transition-colors">hello@joblane.az</a>
              </div>
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Phone className="h-4 w-4" aria-hidden="true" />
                <span>+994 12 555 00 00</span>
              </div>
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <MapPin className="h-4 w-4" aria-hidden="true" />
                <span>Bakı, Azərbaycan</span>
              </div>
            </div>
          </div>

          {/* Navigation Columns */}
          <div className="mt-10 grid gap-8 md:grid-cols-4 lg:mt-0">
            {Object.entries(footerNavigation).map(([title, links]) => (
              <nav key={title} aria-labelledby={`${title}-heading`} className="space-y-4">
                <h3 id={`${title}-heading`} className="font-semibold text-sm">
                  {title}
                </h3>
                <ul className="space-y-3" role="list">
                  {links.map((link) => (
                    <li key={link.name}>
                      <Link
                        href={link.href}
                        className="text-sm text-muted-foreground hover:text-primary transition-colors"
                      >
                        {link.name}
                      </Link>
                    </li>
                  ))}
                </ul>
              </nav>
            ))}
          </div>
        </div>

        {/* Social & Legal */}
        <div className="mt-12 border-t pt-8">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-6">
            {/* Social Links */}
            <div className="flex items-center gap-4" role="list" aria-label="Sosial media">
              {socialLinks.map((social) => (
                <a
                  key={social.name}
                  href={social.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-muted-foreground hover:text-primary transition-colors"
                  aria-label={social.label}
                >
                  <social.icon className="h-5 w-5" aria-hidden="true" />
                </a>
              ))}
            </div>

            {/* Copyright */}
            <p className="text-sm text-muted-foreground text-center md:text-left">
              © {new Date().getFullYear()} Joblane. Bütün hüquqlar qorunur.
            </p>

            {/* Language & Region */}
            <div className="flex items-center gap-2 text-sm text-muted-foreground" role="group" aria-label="Dil və region">
              <button className="flex items-center gap-1 hover:text-primary transition-colors" aria-label="Dil seçin">
                <Globe className="h-4 w-4" aria-hidden="true" />
                <span>AZ</span>
              </button>
              <span aria-hidden="true">|</span>
              <button className="flex items-center gap-1 hover:text-primary transition-colors" aria-label="Region seçin">
                <MapPin className="h-4 w-4" aria-hidden="true" />
                <span>Azərbaycan</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </footer>
  )
}