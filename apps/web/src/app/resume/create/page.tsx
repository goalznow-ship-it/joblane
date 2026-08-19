"use client"

import Link from "next/link"
import { Header } from "@/components/Header"
import { Footer } from "@/components/Footer"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Separator } from "@/components/ui/separator"
import { FileText, User, Briefcase, Target, Award, Star, ArrowRight, Upload, Download, Edit, Eye, Settings, Plus, Shield } from "lucide-react"
import { cn } from "@/lib/utils"

export default function ResumeCreatePage() {
  const templates = [
    { name: "Modern", desc: "Təmiz, minimalist dizayn" },
    { name: "Classic", desc: "Klassik, peşəkar görünüş" },
    { name: "Creative", desc: "Yaradıcı, unikal stil" },
  ]

  return (
    <div className="min-h-screen flex flex-col">
      <Header />

      <main className="flex-1">
        {/* Hero Section */}
        <section className="relative py-20 lg:py-28 overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-background to-background" />
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-primary/10 via-transparent to-transparent" />
          <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="text-center max-w-3xl mx-auto">
              <div className="inline-flex items-center gap-2 bg-primary/10 text-primary px-4 py-2 rounded-full mb-6">
                <FileText className="h-4 w-4" aria-hidden="true" />
                <span>Yeni! CV yaradın və iş axtarın</span>
              </div>
              <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold tracking-tight text-foreground mb-6">
                Peşəkar CV yaradın
                <br />
                <span className="text-primary">dəqiqələr ərzində</span>
              </h1>
              <p className="text-xl sm:text-2xl text-muted-foreground mb-10 max-w-2xl mx-auto">
                Müasir şablonlarla CV-nizi dəqiqələrdə yaradın, işəgötürənlər tərəfindən tapılın və karyeranızı inkişaf etdirin.
              </p>

              <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
                <Link href="/auth/register?intent=candidate">
                  <Button size="lg" className="px-8 py-3 text-lg w-full sm:w-auto">
                    <FileText className="mr-2 h-5 w-5" aria-hidden="true" />
                    CV yarat (Pulsuz)
                  </Button>
                </Link>
                <Link href="/jobs">
                  <Button variant="outline" size="lg" className="px-8 py-3 text-lg w-full sm:w-auto">
                    Vakansiyaları araşdır
                  </Button>
                </Link>
              </div>
            </div>
          </div>
        </section>

        {/* Features */}
        <section className="py-16 lg:py-24">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="text-center mb-16">
              <h2 className="text-3xl sm:text-4xl font-bold mb-4">Niyə Joblane CV?</h2>
              <p className="text-lg text-muted-conditional max-w-2xl mx-auto">
                Peşəkar CV yaradmaq heç vaxt bu qədər asan olmamışdı. Müasir alətlərlə karyeranızı irəli sürün.
              </p>
            </div>
            <div className="grid md:grid-cols-3 gap-8">
              <div className="text-center p-6">
                <div className="inline-flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/10 text-primary mx-auto mb-4">
                  <FileText className="h-8 w-8" />
                </div>
                <h3 className="text-xl font-semibold mb-2">Müasir şablonlar</h3>
                <p className="text-muted-conditional">Sahənizə uyğun, ATS-dostu və vizual cəlbedici şablonlardan birini seçin.</p>
              </div>
              <div className="text-center p-6">
                <div className="inline-flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/10 text-primary mx-auto mb-4">
                  <Edit className="h-8 w-8" />
                </div>
                <h3 className="text-xl font-semibold mb-2">Asan redaktə</h3>
                <p className="text-muted-conditional">Drag-and-drop interfeysi ilə CV-nizi dəqiqələrdə yaradın ve yeniləyin.</p>
              </div>
              <div className="text-center p-6">
                <div className="inline-flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/10 text-primary mx-auto mb-4">
                  <Download className="h-8 w-8" />
                </div>
                <h3 className="text-xl font-semibold mb-2">PDF və ya link olaraq paylaş</h3>
                <p className="text-muted-conditional">CV-nizi PDF kimi yükləyin və ya unikal link ile işəgötürənlərlə paylaşın.</p>
              </div>
            </div>
          </div>
        </section>

        {/* CV Sections */}
        <section className="py-16 lg:py-24 bg-muted/30 border-y border-border/50">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="text-center mb-16">
              <h2 className="text-3xl sm:text-4xl font-bold mb-4">CV-nizdə nə olmalıdır?</h2>
              <p className="text-lg text-muted-conditional max-w-2xl mx-auto">
                Joblane CV redaktoru sizə bütün vacib bölmeleri asanlıkla doldurma imkanı verir.
              </p>
            </div>
            <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
{[User, Target, Briefcase, Award, Star, FileText, Settings, Shield].map((Icon, i) => (
                <div key={i} className="p-6 bg-background rounded-xl border border-border/50 hover:border-primary/50 transition-colors">
                  <div className="inline-flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10 text-primary mb-4">
                    <Icon className="h-6 w-6" />
                  </div>
                  <h3 className="font-semibold mb-2">Bölmə adı</h3>
                  <p className="text-sm text-muted-foreground">Açıqlama</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* How it works */}
        <section className="py-16 lg:py-24">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="text-center mb-16">
              <h2 className="text-3xl sm:text-4xl font-bold mb-4">3 addımda CV yaradın</h2>
              <p className="text-lg text-muted-conditional max-w-2xl mx-auto">
                Joblane ile CV yaratmaq heç vaxt bu qədər asan olmamışdı.
              </p>
            </div>
            <div className="grid md:grid-cols-3 gap-8">
              <div className="text-center relative">
                <div className="absolute top-0 left-1/2 -translate-x-1/2 w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center text-2xl font-bold text-primary mb-6">
                  1
                </div>
                <div className="pt-20">
                  <div className="inline-flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/10 text-primary mx-auto mb-4">
                    <Upload className="h-8 w-8" />
                  </div>
                  <h3 className="text-xl font-semibold mb-2">Şablon seçin</h3>
                  <p className="text-muted-conditional">Sahənizə uyğun müasir şablonlardan birini seçin. Bütün şablonlar ATS-dostudur.</p>
                </div>
              </div>
              <div className="text-center relative">
                <div className="absolute top-0 left-1/2 -translate-x-1/2 w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center text-2xl font-bold text-primary mb-6">
                  2
                </div>
                <div className="pt-20">
                  <div className="inline-flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/10 text-primary mx-auto mb-4">
                    <Edit className="h-8 w-8" />
                  </div>
                  <h3 className="text-xl font-semibold mb-2">Məlumatları doldurun</h3>
                  <p className="text-muted-conditional">Intuitiv redaktorla təcrübə, təhsil, bacarıqlarınızı əlavə edin. Avtomatik tövsiyələr alın.</p>
                </div>
              </div>
              <div className="text-center relative">
                <div className="absolute top-0 left-1/2 -translate-x-1/2 w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center text-2xl font-bold text-primary mb-6">
                  3
                </div>
                <div className="pt-20">
                  <div className="inline-flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/10 text-primary mx-auto mb-4">
                    <Download className="h-8 w-8" />
                  </div>
                  <h3 className="text-xl font-semibold mb-2">Yükləyin və paylaşın</h3>
                  <p className="text-muted-conditional">PDF kimi yükləyin, unikal link yaradın və işəgötürənlərlə paylaşın.</p>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* CTA Section */}
        <section className="py-16 lg:py-24 text-primary text-primary-foreground">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 text-center">
            <div className="max-w-3xl mx-auto">
              <div className="inline-flex items-center gap-2 bg-primary-foreground/10 px-4 py-2 rounded-full mb-6">
                <Star className="h-5 w-5" aria-hidden="true" />
                <span>Yeni! CV yaradın və iş axtarın</span>
              </div>
              <h2 className="text-3xl sm:text-4xl font-bold mb-4">Hazırsınız karyera yolculuğunuza başlamağa?</h2>
              <p className="text-lg mb-8">
                Minlərlə karyeristlər Joblane ilə peşəkar CV-lar yaradaraq iş tapıb. Siz də onlara qoşulun.
              </p>
              <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
                <Link href="/auth/register?intent=candidate">
                  <Button size="lg" className="px-8 py-3 text-lg w-full sm:w-auto">
                    <FileText className="mr-2 h-5 w-5" aria-hidden="true" />
                    CV-yi pulsuz yaradın
                  </Button>
                </Link>
                <Link href="/jobs">
                  <Button variant="outline" className="border-primary-foreground text-primary-foreground hover:bg-primary-foreground/10 px-8 py-3 text-lg w-full sm:w-auto">
                    Vakansiyaları araşdır
                  </Button>
                </Link>
              </div>
            </div>
          </div>
        </section>

        {/* Preview Section */}
        <section className="py-16 lg:py-24 bg-muted/30 border-y border-border/50">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="text-center mb-16">
              <h2 className="text-3xl sm:text-4xl font-bold mb-4">CV nümuneleri</h2>
              <p className="text-lg text-muted-conditional max-w-2xl mx-auto">
                Müasir, peşəkar və ATS-dostu şablonlardan birini seçin.
              </p>
            </div>
<div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
  {templates.map((item, i) => (
                <div key={i} className="group relative aspect-[4/3] rounded-2xl overflow-hidden bg-gradient-to-br bg-[from-blue-500_to-purple-600] hover:shadow-2xl hover:shadow-primary/20 transition-all duration-300">
                  <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                  <div className="absolute inset-0 p-6 flex flex-col justify-end">
                    <h3 className="text-xl font-bold text-white mb-1">Şablon adı</h3>
                    <p className="text-white/80 text-sm">{item.desc}</p>
                    <div className="mt-4 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                      <Button variant="outline" className="bg-white/10 text-white border-white/20 hover:bg-white/20 w-full">
                        Önizləmə
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
            <div className="mt-12 text-center">
              <p className="text-muted-foreground mb-4">Bütün şablonlar ATS-dostudur və mobil cihazlarda də xüsusilə yaxşı görünür.</p>
            </div>
          </div>
        </section>

        {/* Final CTA */}
        <section className="py-16 lg:py-24 bg-muted/30 border-y border-border/50">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 text-center">
            <h2 className="text-3xl sm:text-4xl font-bold mb-4">Hazırsınız CV yaradmağa?</h2>
            <p className="text-lg text-muted-conditional mb-8 max-w-2xl mx-auto">
              Dəqiqələr ərzində peşəkar CV yaradın, işəgötürənlər tərəfindən tapılın və karyeranızı irəli sürün.
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <Link href="/auth/register?intent=candidate">
                <Button size="lg" className="px-8 py-3 text-lg w-full sm:w-auto">
                  <FileText className="mr-2 h-5 w-5" aria-hidden="true" />
                  CV-yi pulsuz yaradın
                </Button>
              </Link>
              <Link href="/jobs">
                <Button variant="outline" className="px-8 py-3 text-lg w-full sm:w-auto">
                  Vakansiyaları araşdır
                </Button>
              </Link>
            </div>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  )
}
