"use client"

import Link from "next/link"
import { Header } from "@/components/Header"
import { Footer } from "@/components/Footer"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { Briefcase, Users, Search, BarChart2, Shield, Globe, ArrowRight, Sparkles, Target, Zap, ShieldCheck } from "lucide-react"
import { cn } from "@/lib/utils"

export default function EmployerPage() {
  return (
    <>
      <Header />

      <main className="flex-1">
        {/* Hero Section */}
        <section className="relative py-20 lg:py-28 lg:py-32 overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-background to-background" />
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-primary/10 via-transparent to-transparent" />
          <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="text-center max-w-3xl mx-auto">
              <Badge variant="secondary" className="mb-6 inline-flex items-center gap-2">
                <Sparkles className="h-3 w-3" aria-hidden="true" />
                <span>İşəgötürənlər üçün yeni imkanlar</span>
              </Badge>
              <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold tracking-tight text-foreground mb-6">
                Komandanız üçün
                <br />
                <span className="text-primary">doğru namizədi tapın</span>
              </h1>
              <p className="text-xl sm:text-2xl text-muted-foreground mb-10 max-w-2xl mx-auto">
                Joblane ilə iş elan edin, keyfiyyətli namizədlər axtarın və komandanızı genişləndirin.
                892+ şirkət Joblane-a güvənir.
              </p>

              <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
                <Link href="/employer/post-job">
                  <Button size="lg" className="px-8 py-3 text-lg w-full sm:w-auto">
                    <Briefcase className="mr-2 h-5 w-5" aria-hidden="true" />
                    Elan yerləşdir
                  </Button>
                </Link>
                <Link href="/auth/register?intent=employer">
                  <Button variant="outline" size="lg" className="px-8 py-3 text-lg w-full sm:w-auto">
                    İşəgötürən kimi qeydiyyatdan keç
                  </Button>
                </Link>
              </div>
            </div>
          </div>
        </section>

        {/* Stats */}
        <section className="py-12 bg-muted/30 border-y border-border/50">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
              <div className="text-center">
                <div className="text-3xl sm:text-4xl font-bold text-foreground">892+</div>
                <div className="text-sm text-muted-foreground mt-1">Təsdiq edilmiş şirkət</div>
              </div>
              <div className="text-center">
                <div className="text-3xl sm:text-4xl font-bold text-foreground">45,000+</div>
                <div className="text-sm text-muted-foreground mt-1">Aktiv namizəd</div>
              </div>
              <div className="text-center">
                <div className="text-3xl sm:text-4xl font-bold text-foreground">1,200+</div>
                <div className="text-sm text-muted-foreground mt-1">Günlük aktiv вакансия</div>
              </div>
              <div className="text-center">
                <div className="text-3xl sm:text-4xl font-bold text-foreground">94%</div>
                <div className="text-sm text-muted-foreground mt-1">Müşteri məmnuniyyəti</div>
              </div>
            </div>
          </div>
        </section>

        {/* Features */}
        <section className="py-16 lg:py-24">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="text-center mb-16">
              <h2 className="text-3xl sm:text-4xl font-bold mb-4">Niyə Joblane?</h2>
              <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
                Azərbaycan bazarına xidmət edən müasir, şəffاف və effektiv işəgötürən platforması.
              </p>
            </div>
            <div className="grid md:grid-cols-3 gap-8">
              <div className="text-center p-6">
                <div className="inline-flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/10 text-primary mx-auto mb-4">
                  <Zap className="h-8 w-8" />
                </div>
                <h3 className="text-xl font-semibold mb-2">Sürətli elan yerləşdirmə</h3>
                <p className="text-muted-foreground">İş elanınızı dəqiqələr ərzində yaradın və dərc edin. Avtomatik formatlaşdırma və şablonlar ilə vaxt qənaət edin.</p>
              </div>
              <div className="text-center p-6">
                <div className="inline-flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/10 text-primary mx-auto mb-4">
                  <Target className="h-8 w-8" />
                </div>
                <h3 className="text-xl font-semibold mb-2">Hədəflənmiş namizəd axtarışı</h3>
                <p className="text-muted-foreground">Filtrlərlə (təcrübə, bacarıq, yerləşmə, maaş) sizə uyğun namizədləri dəqiq tapın.</p>
              </div>
              <div className="text-center p-6">
                <div className="inline-flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/10 text-primary mx-auto mb-4">
                  <ShieldCheck className="h-8 w-8" />
                </div>
                <h3 className="text-xl font-semibold mb-2">Təsdiq edilmiş profillər</h3>
                <p className="text-muted-foreground">Bütün namizədlər təsdiq olunur. CV-lər yoxlanılır, qiymətləndirmələr REAL şəxslərə aiddir.</p>
              </div>
            </div>
          </div>
        </section>

        {/* How it works */}
        <section className="py-16 lg:py-24 bg-muted/30 border-y border-border/50">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="text-center mb-16">
              <h2 className="text-3xl sm:text-4xl font-bold mb-4">Necə işləyir?</h2>
              <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
                3 addımda iş elanınızı dərc edin və namizədlərlə əlaqə saxlayın.
              </p>
            </div>
            <div className="grid md:grid-cols-3 gap-8">
              <div className="text-center relative">
                <div className="absolute top-0 left-1/2 -translate-x-1/2 w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center text-2xl font-bold text-primary mb-6">
                  1
                </div>
                <div className="pt-20">
                  <div className="inline-flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/10 text-primary mx-auto mb-4">
                    <svg className="h-8 w-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
                  </div>
                  <h3 className="text-xl font-semibold mb-2">Elan yaradın</h3>
                  <p className="text-muted-foreground">Vəzifə təsvirini yazın, tələbləri qeyd edin, maaş aralığını və iş rejimini təyin edin.</p>
                </div>
              </div>
              <div className="text-center relative">
                <div className="absolute top-0 left-1/2 -translate-x-1/2 w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center text-2xl font-bold text-primary mb-6">
                  2
                </div>
                <div className="pt-20">
                  <div className="inline-flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/10 text-primary mx-auto mb-4">
                    <Target className="h-8 w-8" />
                  </div>
                  <h3 className="text-xl font-semibold mb-2">Namizədləri axtarın</h3>
                  <p className="text-muted-foreground">Filtrlərlə uyğun namizədləri tapın, profilə baxın, CV yükləyin və birbaşa əlaqə saxlayın.</p>
                </div>
              </div>
              <div className="text-center relative">
                <div className="absolute top-0 left-1/2 -translate-x-1/2 w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center text-2xl font-bold text-primary mb-6">
                  3
                </div>
                <div className="pt-20">
                  <div className="inline-flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/10 text-primary mx-auto mb-4">
                    <Zap className="h-8 w-8" />
                  </div>
                  <h3 className="text-xl font-semibold mb-2">Müraciətləri idarə edin</h3>
                  <p className="text-muted-foreground">Müraciətləri izləyin, interviewlər planlaşdırın, komandanızla əməkdaşlıq edin və qərar qəbul edin.</p>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Pricing / CTA */}
        <section className="py-16 lg:py-24 bg-primary text-primary-foreground">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 text-center">
            <div className="max-w-3xl mx-auto">
              <div className="inline-flex items-center gap-2 bg-primary-foreground/10 px-4 py-2 rounded-full mb-6">
                <Sparkles className="h-5 w-5" aria-hidden="true" />
                <span>Yeni! İşəgötürənlər üçün pulsuz başlanğıc</span>
              </div>
              <h2 className="text-3xl sm:text-4xl font-bold mb-4">Hazırsınız komandanızı genişləndirməyə?</h2>
              <p className="text-lg mb-8">
                İlk iş elanınızı pulsuz dərc edin. Ödənişsiz sınaq müddəti, heç bir öhdəlik yoxdur.
              </p>
              <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
                <Link href="/employer/post-job">
                  <Button size="lg" className="bg-primary-foreground text-primary px-8 py-3 text-lg w-full sm:w-auto">
                    <Briefcase className="mr-2 h-5 w-5" aria-hidden="true" />
                    İlk elanı pulsuz dərc et
                  </Button>
                </Link>
                <Link href="/employer/pricing">
                  <Button variant="outline" className="border-primary-foreground text-primary-foreground hover:bg-primary-foreground/10 px-8 py-3 text-lg w-full sm:w-auto">
                    Qiymətlərə bax
                  </Button>
                </Link>
              </div>
            </div>
          </div>
        </section>

        {/* Testimonials / Trust */}
        <section className="py-16 lg:py-24">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="text-center mb-16">
              <h2 className="text-3xl sm:text-4xl font-bold mb-4">Şirməklə Güvənir</h2>
              <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
                Azərbaycanın önde gələn şirkətləri Joblane ilə komandalarını gücləndirir.
              </p>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-8 opacity-60 hover:opacity-100 transition-opacity">
              {["PASHA Bank", "Azercell", "SOCAR", "Kapital Bank", "Baku Electronics"].map((name, i) => (
                <div key={i} className="flex items-center justify-center py-8 px-6 bg-muted/30 rounded-xl">
                  <span className="font-semibold text-lg text-muted-foreground/70">{name}</span>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Final CTA */}
        <section className="py-16 lg:py-24 bg-muted/30 border-y border-border/50">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 text-center">
            <h2 className="text-3xl sm:text-4xl font-bold mb-4">Hazırsınız komandanızı genişləndirməyə?</h2>
            <p className="text-lg text-muted-conditional mb-8 max-w-2xl mx-auto">
              Minlərlə şirkətlər Joblane ilə komandalarını genişləndirmiştir. Siz də onlara qoşulun.
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <Link href="/employer/post-job">
                <Button size="lg" className="px-8 py-3 text-lg w-full sm:w-auto">
                  <Briefcase className="mr-2 h-5 w-5" aria-hidden="true" />
                  İlk elanı pulsuz dərc et
                </Button>
              </Link>
              <Link href="/auth/register?intent=employer">
                <Button variant="outline" size="lg" className="px-8 py-3 text-lg w-full sm:w-auto">
                  İşəgötürən kimi qeydiyyatdan keç
                </Button>
              </Link>
            </div>
          </div>
        </section>
      </main>

      <Footer />
    </>
  )
}
